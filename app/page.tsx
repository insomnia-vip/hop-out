"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Copy, ExternalLink, LoaderCircle, ShieldCheck, Terminal } from "lucide-react";
import type { ExitReport, QuoteError } from "@/lib/hopout/types";

const SAMPLE_TOKEN = "0xac79255f6f404eba14f316e8669d76573a2d7b1e";
const SAMPLE_AMOUNT = "1000000";
type Mode = "amount" | "wallet";
type RecentCheck = { address: string; symbol: string; checkedAt: string };

async function requestQuote(input: { token: string; amount?: string; wallet?: string }) {
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as ExitReport | QuoteError;
  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Quote failed.");
  }
  return payload;
}

function compact(value: number | null, maximumFractionDigits = 4) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits, notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard" }).format(value);
}
function money(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
}
function shorten(value: string, lead = 6) {
  return value.length > lead * 2 + 3 ? `${value.slice(0, lead)}…${value.slice(-lead)}` : value;
}
function verdict(haircut: number | null) {
  if (haircut == null) return { label: "UNKNOWN DOOR", tone: "neutral" };
  if (haircut < 5) return { label: "WIDE OPEN", tone: "good" };
  if (haircut < 15) return { label: "TIGHT EXIT", tone: "warn" };
  if (haircut < 35) return { label: "SMALL DOOR", tone: "bad" };
  return { label: "YOU ARE THE LIQUIDITY", tone: "danger" };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("amount");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [report, setReport] = useState<ExitReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<RecentCheck[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("hop-out-recent") || "[]");
        if (Array.isArray(saved)) setRecent(saved.slice(0, 4));
      } catch { /* local history is optional */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "inspect_exit_liquidity",
      title: "Inspect exit liquidity",
      description: "Estimate the proceeds and price-impact haircut for selling a Pons V2 token amount or the balance of a public wallet on Robinhood Chain.",
      inputSchema: {
        type: "object",
        properties: {
          token: { type: "string", description: "Pons V2 token contract address." },
          amount: { type: "string", description: "Human-readable token amount. Use either amount or wallet." },
          wallet: { type: "string", description: "Public wallet address whose full token balance should be inspected. Use either wallet or amount." },
        },
        required: ["token"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input: unknown) {
        const value = input as { token?: unknown; amount?: unknown; wallet?: unknown };
        if (typeof value.token !== "string" || (typeof value.amount !== "string" && typeof value.wallet !== "string")) {
          throw new Error("Provide token and either amount or wallet as strings.");
        }
        const nextMode: Mode = typeof value.wallet === "string" ? "wallet" : "amount";
        setMode(nextMode); setToken(value.token);
        if (nextMode === "wallet") setWallet(value.wallet as string); else setAmount(value.amount as string);
        setLoading(true); setError("");
        try {
          const nextReport = await requestQuote({ token: value.token, ...(nextMode === "wallet" ? { wallet: value.wallet as string } : { amount: value.amount as string }) });
          setReport(nextReport);
          return {
            token: nextReport.token.symbol,
            amount: nextReport.position.amount,
            quotes: nextReport.quotes.map((quote) => ({ sellPercent: quote.fraction * 100, proceedsUsd: quote.proceedsUsd, haircutPct: quote.haircutPct })),
            observedAt: nextReport.observedAt,
          };
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Could not inspect this token.";
          setError(message); throw new Error(message);
        } finally { setLoading(false); }
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const fullQuote = report?.quotes.find((quote) => quote.fraction === 1) ?? null;
  const fullVerdict = useMemo(() => verdict(fullQuote?.haircutPct ?? null), [fullQuote?.haircutPct]);

  async function inspect() {
    setLoading(true); setError(""); setReport(null);
    try {
      const payload = await requestQuote({ token: token.trim(), ...(mode === "amount" ? { amount: amount.trim() } : { wallet: wallet.trim() }) });
      setReport(payload);
      const next = [{ address: payload.token.address, symbol: payload.token.symbol, checkedAt: payload.observedAt }, ...recent.filter((item) => item.address !== payload.token.address)].slice(0, 4);
      setRecent(next); localStorage.setItem("hop-out-recent", JSON.stringify(next));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not inspect this token.");
    } finally { setLoading(false); }
  }

  function loadSample() { setMode("amount"); setToken(SAMPLE_TOKEN); setAmount(SAMPLE_AMOUNT); setError(""); }

  async function copyReceipt() {
    if (!report || !fullQuote) return;
    const line = [`HOP OUT / ${report.token.symbol}`, `Bag: ${compact(Number(report.position.amount))} ${report.token.symbol}`, `Spot: ${money(fullQuote.spotValueUsd)}`, `Exit: ${money(fullQuote.proceedsUsd)}`, `Haircut: ${compact(fullQuote.haircutPct, 1)}%`, `Verdict: ${fullVerdict.label}`, `Observed: ${new Date(report.observedAt).toISOString()}`].join("\n");
    await navigator.clipboard.writeText(line); setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="HOP OUT home"><span className="brand-mark">H</span><span>HOP OUT</span></a>
        <nav aria-label="Primary navigation"><a href="#terminal">TERMINAL</a><a href="#method">METHOD</a><a href="https://github.com/insomnia-vip/hop-out" target="_blank" rel="noreferrer">GITHUB <ArrowUpRight size={13} /></a></nav>
        <span className="network-pill"><i /> ROBINHOOD CHAIN</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><Terminal size={14} /> READ-ONLY EXIT LIQUIDITY TERMINAL</div>
          <h1>YOUR BAG GREW.<br /><span>THE EXIT DIDN&apos;T.</span></h1>
          <p className="hero-deck">The chart shows what your tokens are worth at the last price. HOP OUT estimates what the pool could actually pay.</p>
          <form className="hero-quick" onSubmit={(event) => { event.preventDefault(); void inspect(); }}>
            <input aria-label="Quick token contract" value={token} onChange={(event) => setToken(event.target.value)} placeholder="TOKEN CONTRACT  0x..." spellCheck={false} />
            <input aria-label="Quick token amount" value={amount} onChange={(event) => { setMode("amount"); setAmount(event.target.value); }} placeholder="AMOUNT" inputMode="decimal" />
            <button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <ChevronRight size={18} />}<span>CHECK</span></button>
          </form>
          <div className="hero-actions"><a className="primary-action" href="#terminal">OPEN FULL RECEIPT <ChevronRight size={18} /></a><button className="text-action" type="button" onClick={loadSample}>LOAD LIVE SAMPLE</button></div>
          <div className="trust-row"><span><ShieldCheck size={15} /> NO WALLET CONNECT</span><span>NO KEYS</span><span>NO TRADES</span></div>
        </div>
        <div className="mascot-stage" aria-label="Pixel frog approaching a tiny exit door">
          <div className="grid-glow" /><span className="stage-label">BIG BAG</span>
          <Image className="mascot" src="/hop-out-toad.png" alt="Acid green pixel frog mascot" width={768} height={768} priority />
          <div className="door"><span>EXIT</span><i /></div><span className="door-caption">SMALL DOOR</span>
        </div>
      </section>

      <section className="ticker" aria-label="Product principles"><div><span>SPOT PRICE IS NOT EXIT PRICE</span><b>✦</b><span>HOW BIG IS THE DOOR?</span><b>✦</b><span>READ THE POOL, NOT THE POST</span><b>✦</b><span>SPOT PRICE IS NOT EXIT PRICE</span></div></section>

      <section className="terminal-section" id="terminal">
        <div className="section-heading"><div><span>01 / TERMINAL</span><h2>PUT THE BAG ON THE SCALE.</h2></div><p>Live public data. One token, one position, four exit sizes.</p></div>
        <div className="terminal-shell">
          <div className="terminal-bar"><span className="window-dots"><i /><i /><i /></span><span>hop-out://robinhood/inspect</span><span className="live-indicator"><i /> LIVE DATA</span></div>
          <div className="terminal-grid">
            <form className="quote-form" onSubmit={(event) => { event.preventDefault(); void inspect(); }}>
              <label><span>01 — PONS V2 TOKEN CONTRACT</span><input aria-label="Token contract address" value={token} onChange={(event) => setToken(event.target.value)} placeholder="0x..." spellCheck={false} /></label>
              <div className="mode-tabs" role="tablist" aria-label="Position input mode"><button type="button" className={mode === "amount" ? "active" : ""} onClick={() => setMode("amount")}>TOKEN AMOUNT</button><button type="button" className={mode === "wallet" ? "active" : ""} onClick={() => setMode("wallet")}>PUBLIC WALLET</button></div>
              {mode === "amount" ? <label><span>02 — HOW MANY TOKENS?</span><input aria-label="Token amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1000000" /></label> : <label><span>02 — PUBLIC WALLET ADDRESS</span><input aria-label="Public wallet address" value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." spellCheck={false} /></label>}
              <button className="inspect-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={18} /> READING THE POOL</> : <>INSPECT MY EXIT <ArrowUpRight size={18} /></>}</button>
              <button className="sample-button" type="button" onClick={loadSample}>USE COPY AS A LIVE SAMPLE</button>
              {error && <div className="form-error" role="alert">ERR / {error}</div>}
              <p className="privacy-note"><ShieldCheck size={14} /> Addresses are read only. Recent checks stay in this browser.</p>
            </form>

            <div className={`receipt ${report ? "has-report" : ""}`} aria-live="polite">
              {!report ? <div className="receipt-empty"><Image src="/hop-out-toad.png" alt="" width={120} height={120} /><span>WAITING FOR A BAG</span><p>Enter a contract and position.<br />The frog will measure the door.</p></div> : <>
                <div className="receipt-head"><div><span>EXIT RECEIPT</span><h3>{report.token.name} <b>${report.token.symbol}</b></h3></div><span className={`verdict ${fullVerdict.tone}`}>{fullVerdict.label}</span></div>
                <div className="receipt-meta"><span>{shorten(report.token.address, 7)}</span><span>{report.market.phaseLabel}</span><span>{report.method.precision === "protocol-math" ? "EXACT CURVE MATH" : "DEPTH ESTIMATE"}</span></div>
                <div className="headline-numbers"><div><span>SCREEN VALUE</span><strong>{money(fullQuote?.spotValueUsd ?? null)}</strong><small>{compact(fullQuote?.spotValueQuote ?? null)} {report.market.pairLabel}</small></div><div className="arrow-cell">→</div><div><span>EST. EXIT</span><strong>{money(fullQuote?.proceedsUsd ?? null)}</strong><small>{compact(fullQuote?.proceedsQuote ?? null)} {report.market.pairLabel}</small></div></div>
                <div className="haircut-line"><span>THE DOOR TAKES</span><strong>{compact(fullQuote?.haircutPct ?? null, 1)}%</strong></div>
                <div className="quote-table"><div className="quote-row table-head"><span>SELL</span><span>SPOT</span><span>YOU GET</span><span>HAIRCUT</span></div>{report.quotes.map((quote) => <div className="quote-row" key={quote.fraction}><span>{quote.fraction * 100}%</span><span>{money(quote.spotValueUsd)}</span><span>{money(quote.proceedsUsd)}</span><span className={(quote.haircutPct ?? 0) >= 15 ? "hot" : ""}>{compact(quote.haircutPct, 1)}%</span></div>)}</div>
                <div className="receipt-facts"><span>POOL LIQUIDITY <b>{money(report.market.liquidityUsd)}</b></span><span>24H VOLUME <b>{money(report.market.volume24hUsd)}</b></span><span>FEES MODELED <b>{(report.market.totalFeeBps / 100).toFixed(2)}%</b></span></div>
                <p className="method-note">{report.method.note}</p>
                <div className="receipt-actions"><button type="button" onClick={() => void copyReceipt()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "COPIED" : "COPY RECEIPT"}</button>{report.links.market && <a href={report.links.market} target="_blank" rel="noreferrer">OPEN MARKET <ExternalLink size={14} /></a>}</div>
              </>}
            </div>
          </div>
        </div>
        {recent.length > 0 && <div className="recent-row"><span>RECENT / LOCAL</span>{recent.map((item) => <button key={item.address} type="button" onClick={() => { setToken(item.address); document.querySelector("#terminal")?.scrollIntoView(); }}>${item.symbol} <small>{shorten(item.address, 4)}</small></button>)}</div>}
      </section>

      <section className="method-section" id="method">
        <div className="section-heading inverse"><div><span>02 / METHOD</span><h2>THE RECEIPT, NOT THE HYPE.</h2></div><p>Transparent assumptions. Reproducible numbers. Zero custody.</p></div>
        <div className="method-cards"><article><span>01</span><h3>READ THE BAG</h3><p>Use a token amount or read the balance of a public address. Nothing is signed.</p></article><article><span>02</span><h3>READ THE DOOR</h3><p>Before graduation, use live Pons V2 curve reserves. After graduation, use canonical published pool depth.</p></article><article><span>03</span><h3>SHOW THE HAIRCUT</h3><p>Compare last-price value with estimated proceeds at 10%, 25%, 50%, and 100% of the bag.</p></article></div>
        <div className="disclaimer"><ShieldCheck size={18} /><p><b>READ-ONLY BY DESIGN.</b> HOP OUT never connects a wallet, requests a signature, or sends a transaction. Estimates are not executable quotes or financial advice.</p></div>
      </section>

      <footer><div><Image src="/hop-out-toad.png" alt="HOP OUT frog" width={54} height={54} /><strong>HOP OUT</strong></div><p>BIG BAG. SMALL DOOR.</p><span>BUILT FOR ROBINHOOD CHAIN / 2026</span></footer>
    </main>
  );
}
