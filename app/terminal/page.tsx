"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext Link navigation throws at runtime; hard navigations are intentional. */
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowUpRight, Check, Coins, Copy, ExternalLink, LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoReport } from "@/lib/hopout/demo";
import { validateInput } from "@/lib/hopout/input";
import { renderReceipt } from "@/lib/hopout/receipt";
import type { ExitReport, QuoteError } from "@/lib/hopout/types";
import { PROJECT_LINKS } from "@/lib/hopout/links";

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
      annotations: { readOnlyHint: true, untrustedContentHint: true },
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
    <main className="tool-app">
      <header className="tool-header">
        <a className="tool-logo" href="/" aria-label="HOP OUT home">
          <Image src="/hop-out-toad-cutout.png" width={42} height={42} alt="" priority />
          <span><b>HOP OUT</b><small>V0.6 EXIT LIQUIDITY DESK</small></span>
        </a>
        <div className="tool-commandbar" aria-label="Terminal status">
          <span>hop@rh:~/terminal</span><b>$</b><em>inspect --chain 4663</em><i />
        </div>
        <nav aria-label="Terminal navigation">
          <span className="tool-network"><i /> RH 4663</span>
          <a href="/docs">DOCS</a>
          <a href="/holders">HOLDERS</a>
          <a href={PROJECT_LINKS.github} target="_blank" rel="noreferrer">SOURCE ↗</a>
          <a href="/">SITE ↗</a>
        </nav>
      </header>

      <section className="tool-context" aria-label="Inspection context">
        <div><span>SESSION</span><b className="live"><i /> {status}</b></div>
        <div><span>POSITION SOURCE</span><b>{mode === "amount" ? "TOKEN AMOUNT" : "PUBLIC WALLET"}</b></div>
        <div><span>ENGINE</span><b>EXIT ESTIMATE</b></div>
        <div><span>OUTPUT</span><b>4 EXIT SIZES</b></div>
      </section>

      <section className="tool-layout" id="terminal">
        <aside className="tool-setup">
          <div className="tool-section-head">
            <div><span>01</span><h1>BUILD THE CHECK</h1></div>
            <b>NO CONNECT</b>
          </div>

          <form className="tool-form" onSubmit={(event) => { event.preventDefault(); void inspect(); }}>
            <label className="tool-field">
              <span>CHOOSE TOKEN</span>
              <select
                aria-label="Known token or custom contract"
                value={token.trim().toLowerCase() === SAMPLE_TOKEN ? "copy" : "custom"}
                onChange={(event) => {
                  if (event.target.value === "copy") setToken(SAMPLE_TOKEN);
                  else if (token.trim().toLowerCase() === SAMPLE_TOKEN) setToken("");
                  setReport(null);
                  setError("");
                }}
              >
                <option value="copy">COPY — loaded example</option>
                <option value="custom">Custom token contract</option>
              </select>
            </label>

            <label className="tool-field">
              <span>TOKEN CONTRACT <small>REQUIRED</small></span>
              <input
                value={token}
                onChange={(event) => { setToken(event.target.value); setReport(null); }}
                aria-label="Pons V2 token contract"
                spellCheck={false}
                placeholder="0x..."
                required
              />
              <p>Paste any Pons V2 token contract on Robinhood Chain.</p>
            </label>

            <div className="position-source">
              <span>POSITION SOURCE</span>
              <Tabs value={mode} onValueChange={(value) => { setMode(value as Mode); setError(""); setReport(null); }} className="source-tabs">
                <TabsList aria-label="Position source">
                  <TabsTrigger value="amount"><Coins size={15} /> TOKEN AMOUNT</TabsTrigger>
                  <TabsTrigger value="wallet"><Wallet size={15} /> PUBLIC WALLET</TabsTrigger>
                </TabsList>
                <TabsContent value="amount">
                  <label className="tool-field">
                    <span>AMOUNT TO TEST <small>EXACT QUANTITY</small></span>
                    <input
                      value={amount}
                      onChange={(event) => { setAmount(event.target.value); setReport(null); }}
                      inputMode="decimal"
                      aria-label="Token amount"
                      placeholder="1000000"
                      required={mode === "amount"}
                    />
                    <p>Enter the number of tokens you want to test against the current exit.</p>
                  </label>
                </TabsContent>
                <TabsContent value="wallet">
                  <label className="tool-field">
                    <span>PUBLIC WALLET ADDRESS <small>NO CONNECT</small></span>
                    <input
                      value={wallet}
                      onChange={(event) => { setWallet(event.target.value); setReport(null); }}
                      aria-label="Public wallet address"
                      spellCheck={false}
                      placeholder="0x..."
                      required={mode === "wallet"}
                    />
                    <p>We read this token&apos;s public balance. No wallet connection, signature or approval.</p>
                  </label>
                </TabsContent>
              </Tabs>
            </div>

            <button className="tool-run" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={17} /> : <Activity size={17} />}
              <span>{loading ? "READING MARKET..." : "CALCULATE EXIT"}</span>
              <kbd>ENTER</kbd>
            </button>

            <div className="tool-quick">
              <button type="button" onClick={loadSample} disabled={loading}>LOAD COPY SAMPLE</button>
              <button type="button" onClick={loadDemo} disabled={loading}>OPEN OFFLINE DEMO</button>
            </div>

            {error && <div className="tool-error" role="alert"><b>INPUT ERROR</b><span>{error}</span></div>}
          </form>

          <div className="tool-safe">
            <ShieldCheck size={18} />
            <div><b>NON-CUSTODIAL BY DESIGN</b><p>No browser wallet, private keys, approvals or transaction path.</p></div>
          </div>
        </aside>

        <section className="tool-results" aria-live="polite">
          <div className="tool-section-head results-head">
            <div><span>02</span><h2>EXIT RECEIPT</h2></div>
            <b className={"signal " + signal.tone}>{signal.label}</b>
          </div>

          {!report ? (
            <div className="tool-empty">
              <Image src="/hop-out-toad-cutout.png" width={124} height={124} alt="" />
              <div>
                <span>READY FOR INPUT</span>
                <h2>SEE WHAT THE WHOLE BAG CAN ACTUALLY EXIT FOR.</h2>
                <p>COPY and 1,000,000 tokens are loaded. Press <b>Calculate exit</b> for a live read, or switch to a public wallet.</p>
              </div>
            </div>
          ) : (
            <div className="tool-report">
              <div className="report-identity">
                <div><span>TOKEN</span><strong>${report.token.symbol}</strong><small>{short(report.token.address)}</small></div>
                <div><span>POSITION</span><strong>{number(report.position.amount)}</strong><small>{report.position.sellableCapped ? `${number(report.position.sellableAmount)} sellable now` : report.position.source === "wallet" ? short(report.position.wallet || "", 6) : "manual amount"}</small></div>
                <div><span>MARKET</span><strong>{report.market.phaseLabel}</strong><small>{report.market.venue}</small></div>
                <div><span>OBSERVED</span><strong>{isDemo ? "DEMO" : "LIVE"}</strong><small>{new Date(report.observedAt).toLocaleTimeString()}</small></div>
              </div>

              <div className="report-summary">
                <div><span>SCREEN VALUE</span><strong>{money(full?.spotValueUsd ?? null)}</strong><small>{number(full?.spotValueQuote ?? null, 8)} {report.market.pairLabel}</small></div>
                <i>→</i>
                <div className="exit-value"><span>EST. FULL EXIT</span><strong>{money(full?.proceedsUsd ?? null)}</strong><small>{number(full?.proceedsQuote ?? null, 8)} {report.market.pairLabel}</small></div>
                <div className="haircut-value"><span>EXIT HAIRCUT</span><strong>{number(full?.haircutPct ?? null, 2)}%</strong><small>price impact + modeled fees</small></div>
              </div>

              <div className="report-table-wrap">
                <table className="tool-exit-table">
                  <caption className="sr-only">Estimated proceeds by independent sale size</caption>
                  <thead><tr><th>EXIT SIZE</th><th>TESTED TOKENS</th><th>SPOT VALUE</th><th>EST. PROCEEDS</th><th>HAIRCUT</th><th>VALUE RETAINED</th></tr></thead>
                  <tbody>{report.quotes.map((quote) => {
                    const retained = quote.haircutPct == null ? 0 : Math.max(0, 100 - quote.haircutPct);
                    return <tr key={quote.fraction}>
                      <th scope="row"><b>{quote.fraction * 100}%</b><small>{quote.fraction === 1 ? "FULL BAG" : "INDEPENDENT TEST"}</small></th>
                      <td>{number(quote.tokenAmount)}</td>
                      <td>{quote.spotValueUsd == null ? number(quote.spotValueQuote, 8) + " " + report.market.pairLabel : money(quote.spotValueUsd)}</td>
                      <td>{quote.proceedsUsd == null ? number(quote.proceedsQuote, 8) + " " + report.market.pairLabel : money(quote.proceedsUsd)}</td>
                      <td className={(quote.haircutPct ?? 0) >= 15 ? "hot" : ""}>{number(quote.haircutPct, 2)}%</td>
                      <td><span className="tool-retained"><i style={{ width: String(retained) + "%" }} /></span></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>

              <div className="report-note">
                <ShieldCheck size={16} />
                <p><b>{report.method.label}.</b> {report.method.note}</p>
              </div>
            </div>
          )}

          {recent.length > 0 && <div className="tool-recent"><span>RECENT / THIS DEVICE</span>{recent.map((item) =>
            <button key={item.address} type="button" onClick={() => { setToken(item.address); setReport(null); }}>
              ${item.symbol} <small>{short(item.address, 4)}</small>
            </button>,
          )}</div>}
        </section>

        <aside className="tool-inspector">
          <section>
            <div className="inspector-head"><span>ENGINE STATUS</span><b><i /> {status}</b></div>
            <div className="tool-log">{systemLines.map(([kind, line], index) =>
              <p key={index}><b className={kind === "ERR" ? "log-error" : ""}>{kind}</b><span>{line}</span></p>,
            )}</div>
          </section>

          <section>
            <div className="inspector-head"><span>MARKET CONTEXT</span></div>
            <dl className="tool-market">
              <div><dt>METHOD</dt><dd>{report ? report.method.label : "awaiting check"}</dd></div>
              <div><dt>LIQUIDITY</dt><dd>{report ? money(report.market.liquidityUsd) : "—"}</dd></div>
              <div><dt>24H VOLUME</dt><dd>{report ? money(report.market.volume24hUsd) : "—"}</dd></div>
              <div><dt>FEES MODELED</dt><dd>{report ? (report.market.totalFeeBps / 100).toFixed(2) + "%" : "—"}</dd></div>
              <div><dt>STATE</dt><dd>{report?.evidence.blockNumber ? "block " + report.evidence.blockNumber : report?.evidence.poolId ? short(report.evidence.poolId, 5) : "—"}</dd></div>
            </dl>
          </section>

          <section className="inspector-boundary">
            <div className="inspector-head"><span>SAFETY BOUNDARY</span></div>
            <p><Check size={14} /> Public chain and market reads</p>
            <p><Check size={14} /> Address-only wallet lookup</p>
            <p><Check size={14} /> No signer or transaction</p>
            <p><Check size={14} /> No executable-price promise</p>
          </section>

          {report && <section className="tool-actions">
            <div className="inspector-head"><span>RECEIPT ACTIONS</span></div>
            <button type="button" onClick={() => void copyReceipt()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "COPIED" : "COPY RECEIPT"}</button>
            <div>
              {report.links.market && <a href={report.links.market} target="_blank" rel="noreferrer">MARKET <ExternalLink size={13} /></a>}
              {report.links.explorer && <a href={report.links.explorer} target="_blank" rel="noreferrer">EXPLORER <ExternalLink size={13} /></a>}
            </div>
          </section>}

          <div className="tool-mascot">
            <Image src="/hop-out-toad-cutout.png" width={74} height={74} alt="" />
            <p><span>BIG BAG.</span><b>CHECK THE DOOR.</b></p>
          </div>
        </aside>
      </section>

      <footer className="tool-footer">
        <span>HOP OUT / V0.6 / EXIT LIQUIDITY DESK</span>
        <a href="/#how-it-works">HOW IT WORKS <ArrowUpRight size={13} /></a>
        <span>NO WALLET CONNECT / NO TRADES</span>
      </footer>
    </main>
  );
}
