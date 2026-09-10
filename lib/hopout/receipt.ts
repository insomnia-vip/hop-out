import type { ExitReport } from "./types.js";

// External token names are data, including when printed in an ANSI terminal.
export const plain = (value: string) => value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/[<>`|]/g, "").slice(0, 160);
export const quoteValue = (value: number | null, label: string) => value == null ? "unavailable" : `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${plain(label)}`;
export const usdValue = (value: number | null) => value == null ? "unavailable" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });

export function renderReceipt(report: ExitReport, markdown = false) {
  const full = report.quotes.at(-1)!;
  const lines = [
    markdown ? "# HOP OUT — exit receipt" : "HOP OUT  //  BIG BAG. SMALL DOOR.",
    `${report.evidence.mode.toUpperCase()} / ${plain(report.token.symbol)} / ${report.method.label}`,
    `Observed: ${report.observedAt}`,
    `Token: ${report.token.address}`,
    `Position: ${report.position.amount} ${plain(report.token.symbol)}`,
    `Block: ${report.evidence.blockNumber ?? "not pinned (published market snapshot)"}`,
    `Screen: ${quoteValue(full.spotValueQuote, report.market.pairLabel)} (${usdValue(full.spotValueUsd)})`,
    `Est. exit: ${quoteValue(full.proceedsQuote, report.market.pairLabel)} (${usdValue(full.proceedsUsd)})`,
    "", "| Sell | Spot (quote) | Est. proceeds (quote) | Haircut |", "| --- | ---: | ---: | ---: |",
    ...report.quotes.map((q) => `| ${q.fraction * 100}% | ${quoteValue(q.spotValueQuote, report.market.pairLabel)} | ${quoteValue(q.proceedsQuote, report.market.pairLabel)} | ${q.haircutPct == null ? "unknown" : q.haircutPct.toFixed(2) + "%"} |`),
    "", `Method: ${report.method.note}`,
    `Sources: ${report.evidence.sources.join(", ") || "synthetic offline fixture; no network"}`,
  ];
  return lines.join("\n") + "\n";
}
