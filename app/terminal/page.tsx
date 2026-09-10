"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Code2, Copy, ExternalLink, LoaderCircle, ShieldCheck, Terminal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoReport } from "@/lib/hopout/demo";
import { validateInput } from "@/lib/hopout/input";
import { renderReceipt } from "@/lib/hopout/receipt";
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
  if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Quote failed.");
  return payload;
}

function number(value: number | string | null, digits = 4) {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (parsed == null || !Number.isFinite(parsed)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    notation: Math.abs(parsed) >= 1_000_000 ? "compact" : "standard",
  }).format(parsed);
}
function money(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}
function short(value: string, lead = 7) {
  return value.length > lead * 2 + 3 ? `${value.slice(0, lead)}…${value.slice(-lead)}` : value;
}
function verdict(haircut: number | null) {
  if (haircut == null) return { label: "NO SIGNAL", tone: "idle" };
  if (haircut < 5) return { label: "WIDE EXIT", tone: "safe" };
  if (haircut < 15) return { label: "TIGHT EXIT", tone: "warn" };
  if (haircut < 35) return { label: "SMALL DOOR", tone: "risk" };
  return { label: "YOU ARE THE LIQUIDITY", tone: "danger" };
}

export default function TerminalPage() {
  const [mode, setMode] = useState<Mode>("amount");
  const [token, setToken] = useState(SAMPLE_TOKEN);
  const [amount, setAmount] = useState(SAMPLE_AMOUNT);
  const [wallet, setWallet] = useState("");
  const [report, setReport] = useState<ExitReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<RecentCheck[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("hop-out-recent") || "[]");
        if (Array.isArray(saved)) {
          setRecent(saved.filter((item) =>
            item && /^0x[0-9a-fA-F]{40}$/.test(item.address) &&
            typeof item.symbol === "string" && typeof item.checkedAt === "string",
          ).slice(0, 4));
        }
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
      description: "Estimate proceeds and price-impact haircut for a Pons V2 token amount or public wallet balance on Robinhood Chain.",
      inputSchema: {
        type: "object",
        properties: {
          token: { type: "string", description: "Pons V2 token contract address." },
          amount: { type: "string", description: "Token amount. Use either amount or wallet." },
          wallet: { type: "string", description: "Public wallet address. Use either wallet or amount." },
        },
        required: ["token"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input: unknown) {
        const value = validateInput(input);
        if (busy.current) throw new Error("An inspection is already running.");
        busy.current = true;
        setLoading(true); setError(""); setReport(null);
        const nextMode: Mode = value.wallet ? "wallet" : "amount";
        setMode(nextMode); setToken(value.token);
        if (value.wallet) setWallet(value.wallet); else setAmount(value.amount || "");
        try {
          const next = await requestQuote(value);
          setReport(next);
          return {
            token: next.token.symbol,
            amount: next.position.amount,
            quotes: next.quotes.map((quote) => ({
              sellPercent: quote.fraction * 100,
              proceedsUsd: quote.proceedsUsd,
              haircutPct: quote.haircutPct,
            })),
            observedAt: next.observedAt,
          };
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Inspection failed.";
          setError(message);
          throw new Error(message);
        } finally {
          busy.current = false; setLoading(false);
        }
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const full = report?.quotes.find((quote) => quote.fraction === 1) ?? null;
  const signal = useMemo(() => verdict(full?.haircutPct ?? null), [full?.haircutPct]);
  const isDemo = report?.evidence.mode === "demo";
  const status = loading ? "READING POOL" : error ? "INPUT ERROR" : isDemo ? "SYNTHETIC DEMO" : report ? "LIVE SNAPSHOT" : "READY";

  async function inspect() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true); setError(""); setReport(null);
    try {
      const input = { token: token.trim(), ...(mode === "amount" ? { amount: amount.trim() } : { wallet: wallet.trim() }) };
      const next = await requestQuote(input);
      setReport(next);
      const checks = [
        { address: next.token.address, symbol: next.token.symbol, checkedAt: next.observedAt },
        ...recent.filter((item) => item.address !== next.token.address),
      ].slice(0, 4);
      setRecent(checks);
      try { localStorage.setItem("hop-out-recent", JSON.stringify(checks)); } catch { /* optional */ }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not inspect this token.");
    } finally {
      busy.current = false; setLoading(false);
    }
  }

  function loadSample() {
    setMode("amount"); setToken(SAMPLE_TOKEN); setAmount(SAMPLE_AMOUNT); setError(""); setReport(null);
  }
  function loadDemo() {
    if (busy.current) return;
    setReport(demoReport()); setError("");
  }
  async function copyReceipt() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(renderReceipt(report));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError("Clipboard unavailable. Copy the values manually.");
    }
  }

  const systemLines = loading ? [
    ["RUN", "validating token identity"],
    ["RPC", "reading canonical market state"],
    ["WAIT", "calculating four independent exits"],
  ] : error ? [
    ["ERR", error],
    ["READY", "edit the input and run again"],
  ] : report ? [
    [isDemo ? "DEMO" : "DONE", isDemo ? "offline fixture loaded / no network" : "public market snapshot captured"],
    ["MODE", report.method.precision === "protocol-math" ? "pinned curve reserves" : "published pool-depth estimate"],
    ["SOURCE", report.evidence.blockNumber ? `block ${report.evidence.blockNumber}` : report.evidence.poolId ? `pool ${short(report.evidence.poolId, 6)}` : "synthetic reserves"],
  ] : [
    ["READY", "COPY sample loaded in the input"],
    ["NEXT", "run inspection or open offline demo"],
    ["SAFE", "no signer / no transaction path"],
  ];

  return (
    <main className="terminal-app">
      <header className="topline">
        <Link className="micro-brand" href="/" aria-label="HOP OUT home"><span className="status-dot" /> HOP OUT // EXIT LIQUIDITY</Link>
        <nav aria-label="Project links">
          <Link href="/">HOME</Link>
          <a href="#method">METHOD</a>
          <a href="https://github.com/insomnia-vip/hop-out" target="_blank" rel="noreferrer"><Code2 size={15} /> SOURCE</a>
        </nav>
        <span className="chain-label">ROBINHOOD CHAIN / 4663</span>
      </header>

      <section className="workspace" id="terminal">
        <div className="main-console">
          <div className="console-brand">
            <div>
              <h1>HOP OUT</h1>
              <p>THE READ-ONLY EXIT LIQUIDITY TERMINAL</p>
            </div>
            <Image src="/hop-out-toad.png" width={116} height={116} alt="HOP OUT pixel frog" priority />
          </div>

          <form className="command-panel" onSubmit={(event) => { event.preventDefault(); void inspect(); }}>
            <div className="panel-title"><span>01 / POSITION INPUT</span><b><i /> {status}</b></div>
            <label className="field">
              <span>TOKEN CONTRACT</span>
              <input value={token} onChange={(event) => setToken(event.target.value)} aria-label="Pons V2 token contract" spellCheck={false} placeholder="0x..." />
            </label>
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="terminal-tabs">
              <TabsList className="tab-switch" aria-label="Position mode">
                <TabsTrigger value="amount">TOKEN AMOUNT</TabsTrigger>
                <TabsTrigger value="wallet">PUBLIC WALLET</TabsTrigger>
              </TabsList>
              <TabsContent value="amount">
                <label className="field"><span>AMOUNT TO TEST</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" aria-label="Token amount" placeholder="1000000" /></label>
              </TabsContent>
              <TabsContent value="wallet">
                <label className="field"><span>READ FULL BALANCE OF</span><input value={wallet} onChange={(event) => setWallet(event.target.value)} aria-label="Public wallet address" spellCheck={false} placeholder="0x..." /></label>
              </TabsContent>
            </Tabs>
            <div className="command-actions">
              <button className="run-button" type="submit" disabled={loading}>
                {loading ? <LoaderCircle className="spin" size={16} /> : <Terminal size={16} />}
                {loading ? "READING..." : "RUN INSPECTION"}
              </button>
              <button type="button" onClick={loadSample} disabled={loading}>RESET COPY SAMPLE</button>
              <button type="button" onClick={loadDemo} disabled={loading}>OFFLINE DEMO</button>
            </div>
            {error && <div className="console-error" role="alert">ERR / {error}</div>}
          </form>

          <section className="result-panel" aria-live="polite">
            <div className="panel-title">
              <span>02 / EXIT MATRIX</span>
              <b className={`signal ${signal.tone}`}>{signal.label}</b>
            </div>
            {!report ? (
              <div className="empty-output">
                <span className="prompt">&gt;</span>
                <div><strong>WAITING FOR POSITION</strong><p>Run the loaded COPY sample or use the deterministic offline demo.</p></div>
              </div>
            ) : (
              <>
                <div className="token-line">
                  <div><strong>{report.token.symbol}</strong><span>{short(report.token.address)}</span></div>
                  <span>{report.market.phaseLabel}</span>
                  <span>{number(report.position.amount)} TOKENS</span>
                  <span>{isDemo ? "INVENTED DATA" : new Date(report.observedAt).toLocaleString()}</span>
                </div>
                <div className="value-strip">
                  <div><span>SCREEN VALUE</span><strong>{money(full?.spotValueUsd ?? null)}</strong><small>{number(full?.spotValueQuote ?? null, 8)} {report.market.pairLabel}</small></div>
                  <div className="value-arrow">→</div>
                  <div><span>EST. FULL EXIT</span><strong>{money(full?.proceedsUsd ?? null)}</strong><small>{number(full?.proceedsQuote ?? null, 8)} {report.market.pairLabel}</small></div>
                  <div className="door-loss"><span>DOOR TAKES</span><strong>{number(full?.haircutPct ?? null, 2)}%</strong></div>
                </div>
                <table className="exit-table">
                  <caption className="sr-only">Estimated proceeds by sale size</caption>
                  <thead><tr><th>SELL</th><th>TOKENS</th><th>SPOT</th><th>EST. PROCEEDS</th><th>HAIRCUT</th><th>RETAINED</th></tr></thead>
                  <tbody>{report.quotes.map((quote) => {
                    const retained = quote.haircutPct == null ? 0 : Math.max(0, 100 - quote.haircutPct);
                    return <tr key={quote.fraction}>
                      <th scope="row">{quote.fraction * 100}%</th>
                      <td>{number(quote.tokenAmount)}</td>
                      <td>{quote.spotValueUsd == null ? `${number(quote.spotValueQuote, 8)} ${report.market.pairLabel}` : money(quote.spotValueUsd)}</td>
                      <td>{quote.proceedsUsd == null ? `${number(quote.proceedsQuote, 8)} ${report.market.pairLabel}` : money(quote.proceedsUsd)}</td>
                      <td className={(quote.haircutPct ?? 0) >= 15 ? "hot" : ""}>{number(quote.haircutPct, 2)}%</td>
                      <td><span className="retained-track"><i style={{ width: `${retained}%` }} /></span></td>
                    </tr>;
                  })}</tbody>
                </table>
              </>
            )}
          </section>

          {recent.length > 0 && <div className="recent-strip"><span>RECENT / LOCAL</span>{recent.map((item) =>
            <button key={item.address} type="button" onClick={() => { setToken(item.address); setReport(null); }}>
              ${item.symbol} <small>{short(item.address, 4)}</small>
            </button>,
          )}</div>}
        </div>

        <aside className="side-console">
          <section>
            <div className="panel-title"><span>ENGINE / SESSION</span><b><i /> {status}</b></div>
            <div className="system-log">{systemLines.map(([kind, line], index) =>
              <p key={index}><b className={kind === "ERR" ? "log-error" : ""}>{kind}</b><span>{line}</span></p>,
            )}</div>
          </section>

          <section>
            <div className="panel-title"><span>MARKET RECEIPT</span></div>
            <dl className="market-data">
              <div><dt>MODE</dt><dd>{report ? report.method.label : "awaiting inspection"}</dd></div>
              <div><dt>LIQUIDITY</dt><dd>{report ? money(report.market.liquidityUsd) : "—"}</dd></div>
              <div><dt>24H VOLUME</dt><dd>{report ? money(report.market.volume24hUsd) : "—"}</dd></div>
              <div><dt>FEES MODELED</dt><dd>{report ? `${(report.market.totalFeeBps / 100).toFixed(2)}%` : "—"}</dd></div>
              <div><dt>STATE ID</dt><dd>{report?.evidence.blockNumber ? `block ${report.evidence.blockNumber}` : report?.evidence.poolId ? short(report.evidence.poolId, 5) : "—"}</dd></div>
            </dl>
          </section>

          <section className="boundary-panel">
            <div className="panel-title"><span>READ-ONLY BOUNDARY</span></div>
            <p><b>01</b> Public RPC and market data</p>
            <p><b>02</b> No wallet connection</p>
            <p><b>03</b> No keys, approvals or trades</p>
            <p><b>04</b> No executable-price promise</p>
          </section>

          {report && <section className="receipt-tools">
            <div className="panel-title"><span>RECEIPT ACTIONS</span></div>
            <button type="button" onClick={() => void copyReceipt()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "COPIED" : "COPY RECEIPT"}</button>
            {report.links.market && <a href={report.links.market} target="_blank" rel="noreferrer">OPEN MARKET <ExternalLink size={14} /></a>}
            {report.links.explorer && <a href={report.links.explorer} target="_blank" rel="noreferrer">OPEN EXPLORER <ExternalLink size={14} /></a>}
          </section>}

          <div className="frog-note">
            <Image src="/hop-out-toad.png" width={92} height={92} alt="" />
            <div><span>BIG BAG.</span><strong>SMALL DOOR.</strong></div>
          </div>
        </aside>
      </section>

      <section className="method" id="method">
        <div className="method-head"><span>HOW IT WORKS</span><h2>ONE BAG. FOUR EXITS.</h2><p>HOP OUT reads public state, calculates independent 10%, 25%, 50% and 100% sales, then returns a timestamped receipt.</p></div>
        <div className="method-grid">
          <article><b>01</b><h3>READ THE BAG</h3><p>Enter an amount or use a public address balance. Nothing is connected or signed.</p></article>
          <article><b>02</b><h3>READ THE DOOR</h3><p>Curve launches use pinned contract reserves. Graduated launches use canonical published pool depth.</p></article>
          <article><b>03</b><h3>SHOW THE GAP</h3><p>Compare spot value with estimated proceeds, including modeled fees and price impact.</p></article>
        </div>
        <div className="method-warning"><ShieldCheck size={18} /><p><strong>ESTIMATE, NOT EXECUTION.</strong> Pool state can move. Graduated-pool results are depth approximations, not Uniswap v4 executable quotes or financial advice.</p></div>
      </section>

      <footer>
        <span>HOP OUT / 2026</span>
        <a href="https://github.com/insomnia-vip/hop-out" target="_blank" rel="noreferrer">OPEN SOURCE <ArrowUpRight size={14} /></a>
        <span>NO SIGNER / NO TRANSACTION PATH</span>
      </footer>
    </main>
  );
}
