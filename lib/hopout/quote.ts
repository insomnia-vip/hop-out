import {
  createPublicClient,
  defineChain,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
} from "viem";
import { curveSellQuote, marketDepthQuote, percentageDifference } from "./math.mjs";
import type { ExitReport } from "./types";

const PONS_API = "https://api.ponsportal.fun";
const DEX_API = "https://api.dexscreener.com/latest/dex/tokens";
const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const PLATFORM_FEE_BPS = 100;
const FRACTIONS = [0.1, 0.25, 0.5, 1] as const;

const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

const client = createPublicClient({ chain: robinhoodChain, transport: http(RPC_URL) });

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

const curveAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "quoteReserve", type: "uint256" },
      { name: "tokenReserve", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type PonsToken = {
  ok: boolean;
  token: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  curve: Address;
  pairToken: Address;
  pairTokenLabel: string;
  creatorTaxBps: number;
  phase: number;
  phaseLabel: string;
  blockscoutUrl: string;
};

type PonsPrice = {
  ok: boolean;
  priceInPair?: number;
  priceEth?: number;
  poolId?: string;
  lpFeeBps?: number;
};

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceNative?: string;
  priceUsd?: string;
  liquidity?: { usd?: number; base?: number; quote?: number };
  volume?: { h24?: number };
};

type QuoteRequest = { token: string; amount?: string; wallet?: string };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "hop-out/0.1" },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload) {
    throw new Error(`Upstream ${response.status}`);
  }
  return payload;
}

function cleanDecimal(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+(?:\.\d+)?$/.test(trimmed)) return null;
  return trimmed;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function selectPair(pairs: DexPair[], token: string, poolId?: string) {
  const candidates = pairs.filter(
    (pair) =>
      pair.chainId === "robinhood" &&
      pair.baseToken?.address?.toLowerCase() === token.toLowerCase() &&
      Number(pair.liquidity?.usd ?? 0) > 0,
  );
  const canonical = poolId
    ? candidates.find((pair) => pair.pairAddress.toLowerCase() === poolId.toLowerCase())
    : undefined;
  return (
    canonical ??
    candidates.sort(
      (a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0),
    )[0] ??
    null
  );
}

function fractionRaw(total: bigint, fraction: number) {
  return (total * BigInt(Math.round(fraction * 10_000))) / 10_000n;
}

async function resolveAmount(
  input: QuoteRequest,
  token: PonsToken,
): Promise<{ raw: bigint; source: "amount" | "wallet"; wallet: string | null }> {
  if (input.wallet?.trim()) {
    if (!isAddress(input.wallet.trim())) throw new Error("INVALID_WALLET");
    const wallet = input.wallet.trim() as Address;
    const raw = await client.readContract({
      address: token.token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [wallet],
    });
    if (raw <= 0n) throw new Error("EMPTY_WALLET");
    return { raw, source: "wallet", wallet };
  }

  const amount = cleanDecimal(input.amount);
  if (!amount) throw new Error("INVALID_AMOUNT");
  const raw = parseUnits(amount, token.decimals);
  if (raw <= 0n || raw > BigInt(token.totalSupply)) throw new Error("INVALID_AMOUNT");
  return { raw, source: "amount", wallet: null };
}

export async function buildExitReport(input: QuoteRequest): Promise<ExitReport> {
  if (!isAddress(input.token?.trim() ?? "")) throw new Error("INVALID_TOKEN");
  const address = input.token.trim() as Address;

  const [token, price, dex] = await Promise.all([
    fetchJson<PonsToken>(`${PONS_API}/token/${address}`),
    fetchJson<PonsPrice>(`${PONS_API}/token/${address}/price`),
    fetchJson<{ pairs: DexPair[] | null }>(`${DEX_API}/${address}`).catch(() => ({ pairs: [] })),
  ]);

  if (!token.ok) throw new Error("NOT_PONS_V2");
  const position = await resolveAmount(input, token);
  const pair = selectPair(dex.pairs ?? [], address, price.poolId);
  const tokenPriceUsd = toNumber(pair?.priceUsd);
  const priceInPair = toNumber(price.priceInPair ?? price.priceEth ?? pair?.priceNative);
  const pairLabel = token.pairTokenLabel || pair?.quoteToken?.symbol || "QUOTE";
  const pairDecimals =
    token.pairToken.toLowerCase() === ZERO_ADDRESS
      ? 18
      : Number(
          await client.readContract({
            address: token.pairToken,
            abi: erc20Abi,
            functionName: "decimals",
          }),
        );

  if (token.phase === 0) {
    const [[quoteReserve, tokenReserve], curveFee] = await Promise.all([
      client.readContract({ address: token.curve, abi: curveAbi, functionName: "getReserves" }),
      client.readContract({ address: token.curve, abi: curveAbi, functionName: "feeBps" }),
    ]);
    const totalFeeBps = Number(curveFee) + token.creatorTaxBps;
    const currentPrice = priceInPair ?? Number(formatUnits(quoteReserve, pairDecimals)) / Number(formatUnits(tokenReserve, token.decimals));
    const quoteUsd = tokenPriceUsd && currentPrice ? tokenPriceUsd / currentPrice : null;
    const quotes = FRACTIONS.map((fraction) => {
      const amountRaw = fractionRaw(position.raw, fraction);
      const outputRaw = curveSellQuote(amountRaw, tokenReserve, quoteReserve, totalFeeBps);
      const tokenAmount = Number(formatUnits(amountRaw, token.decimals));
      const proceedsQuote = Number(formatUnits(outputRaw, pairDecimals));
      const spotValueQuote = currentPrice ? tokenAmount * currentPrice : null;
      return {
        fraction,
        tokenAmount: formatUnits(amountRaw, token.decimals),
        spotValueQuote,
        proceedsQuote,
        spotValueUsd: spotValueQuote != null && quoteUsd != null ? spotValueQuote * quoteUsd : null,
        proceedsUsd: quoteUsd != null ? proceedsQuote * quoteUsd : null,
        haircutPct: spotValueQuote != null ? percentageDifference(spotValueQuote, proceedsQuote) : null,
      };
    });
    return {
      observedAt: new Date().toISOString(),
      token: { address, name: token.name, symbol: token.symbol, decimals: token.decimals },
      position: {
        source: position.source,
        wallet: position.wallet,
        amount: formatUnits(position.raw, token.decimals),
      },
      market: {
        phase: token.phase,
        phaseLabel: token.phaseLabel,
        venue: "pons-v2-curve",
        pairLabel,
        priceInPair: currentPrice,
        priceUsd: tokenPriceUsd,
        liquidityUsd: toNumber(pair?.liquidity?.usd),
        volume24hUsd: toNumber(pair?.volume?.h24),
        totalFeeBps,
      },
      method: {
        precision: "protocol-math",
        label: "Pons V2 curve math",
        note: "Computed from live curve reserves and the launch's frozen sell fees. State can move before execution.",
      },
      quotes,
      links: { explorer: token.blockscoutUrl, market: pair?.url ?? null },
    };
  }

  if (token.phase !== 2) throw new Error("UNSUPPORTED_PHASE");
  if (!pair?.liquidity?.base || !pair?.liquidity?.quote) throw new Error("NO_MARKET");

  const totalFeeBps = PLATFORM_FEE_BPS + token.creatorTaxBps + Number(price.lpFeeBps ?? 0);
  const quoteUsd = tokenPriceUsd && priceInPair ? tokenPriceUsd / priceInPair : null;
  const positionAmount = Number(formatUnits(position.raw, token.decimals));
  const quotes = FRACTIONS.map((fraction) => {
    const tokenAmountNumber = positionAmount * fraction;
    const proceedsQuote = marketDepthQuote(
      tokenAmountNumber,
      Number(pair.liquidity!.base),
      Number(pair.liquidity!.quote),
      totalFeeBps,
    );
    const spotValueQuote = priceInPair ? tokenAmountNumber * priceInPair : null;
    return {
      fraction,
      tokenAmount: String(tokenAmountNumber),
      spotValueQuote,
      proceedsQuote,
      spotValueUsd: tokenPriceUsd ? tokenAmountNumber * tokenPriceUsd : null,
      proceedsUsd: quoteUsd != null ? proceedsQuote * quoteUsd : null,
      haircutPct: spotValueQuote != null ? percentageDifference(spotValueQuote, proceedsQuote) : null,
    };
  });

  return {
    observedAt: new Date().toISOString(),
    token: { address, name: token.name, symbol: token.symbol, decimals: token.decimals },
    position: {
      source: position.source,
      wallet: position.wallet,
      amount: formatUnits(position.raw, token.decimals),
    },
    market: {
      phase: token.phase,
      phaseLabel: token.phaseLabel,
      venue: "uniswap-v4-depth",
      pairLabel,
      priceInPair,
      priceUsd: tokenPriceUsd,
      liquidityUsd: toNumber(pair.liquidity.usd),
      volume24hUsd: toNumber(pair.volume?.h24),
      totalFeeBps,
    },
    method: {
      precision: "market-depth-estimate",
      label: "Published pool-depth estimate",
      note: "Estimated from the canonical pool's published token and quote depth. Concentrated-liquidity routing and state changes can alter execution.",
    },
    quotes,
    links: { explorer: token.blockscoutUrl, market: pair.url },
  };
}
