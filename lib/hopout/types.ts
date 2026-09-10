export type QuoteRow = {
  fraction: number;
  tokenAmount: string;
  spotValueQuote: number | null;
  proceedsQuote: number;
  spotValueUsd: number | null;
  proceedsUsd: number | null;
  haircutPct: number | null;
};

export type ExitReport = {
  observedAt: string;
  evidence: { mode: "live" | "demo"; blockNumber: string | null; poolId: string | null; sources: string[] };
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  position: {
    source: "amount" | "wallet";
    wallet: string | null;
    amount: string;
  };
  market: {
    phase: number;
    phaseLabel: string;
    venue: "pons-v2-curve" | "uniswap-v4-depth";
    pairLabel: string;
    priceInPair: number | null;
    priceUsd: number | null;
    liquidityUsd: number | null;
    volume24hUsd: number | null;
    totalFeeBps: number;
  };
  method: {
    precision: "protocol-math" | "market-depth-estimate";
    label: string;
    note: string;
  };
  quotes: QuoteRow[];
  links: {
    explorer: string;
    market: string | null;
  };
};

export type QuoteError = {
  error: string;
  code:
    | "INVALID_INPUT"
    | "NOT_PONS_V2"
    | "NO_MARKET"
    | "INSUFFICIENT_RESERVES"
    | "UPSTREAM_UNAVAILABLE"
    | "UNSUPPORTED_PHASE";
};
