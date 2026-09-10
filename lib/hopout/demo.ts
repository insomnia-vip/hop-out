import type { ExitReport } from "./types.js";
import { marketDepthQuote, percentageDifference } from "./math.mjs";

/** Deliberately synthetic. Never fetched, never passed off as live COPY data. */
export function demoReport(): ExitReport {
  const tokenDepth = 1_000_000, quoteDepth = 10, amount = 500_000;
  const spot = quoteDepth / tokenDepth, quoteUsd = 2_000;
  return {
    observedAt: "2026-01-01T00:00:00.000Z",
    evidence: { mode: "demo", blockNumber: null, poolId: null, sources: [] },
    token: { address: "0x0000000000000000000000000000000000000001", name: "Synthetic Pond", symbol: "POND", decimals: 18 },
    position: { source: "amount", amount: String(amount), wallet: null },
    market: { phase: 2, phaseLabel: "Synthetic pool", venue: "uniswap-v4-depth", pairLabel: "ETH", priceInPair: spot, priceUsd: spot * quoteUsd, liquidityUsd: quoteDepth * quoteUsd * 2, volume24hUsd: null, totalFeeBps: 250 },
    method: { precision: "market-depth-estimate", label: "Synthetic depth example", note: "DEMO: invented reserves and prices. Demonstrates the calculation; does not represent a deployed token." },
    quotes: [0.1, 0.25, 0.5, 1].map((fraction) => {
      const tokenAmount = amount * fraction;
      const proceedsQuote = marketDepthQuote(tokenAmount, tokenDepth, quoteDepth, 250);
      return { fraction, tokenAmount: String(tokenAmount), proceedsQuote, spotValueQuote: tokenAmount * spot, proceedsUsd: proceedsQuote * quoteUsd, spotValueUsd: tokenAmount * spot * quoteUsd, haircutPct: percentageDifference(tokenAmount * spot, proceedsQuote) };
    }),
    links: { explorer: "", market: null },
  };
}
