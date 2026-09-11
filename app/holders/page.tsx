/* eslint-disable @next/next/no-html-link-for-pages -- Vinext Link navigation throws at runtime; hard navigations are intentional. */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import { TokenContract } from "@/components/token-contract";
import { PROJECT_LINKS } from "@/lib/hopout/links";
import type { ExitReport } from "@/lib/hopout/types";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: "accountsChanged", listener: (accounts: string[]) => void): void;
  removeListener?(event: "accountsChanged", listener: (accounts: string[]) => void): void;
};

type HolderStatus = {
  ready: boolean;
  ticker: string;
  chainId: number;
  contract: string | null;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function short(address: string, size = 6) {
  return address ? `${address.slice(0, size)}…${address.slice(-4)}` : "—";
}

function number(value: string | number | null | undefined, digits = 4) {
  if (value == null) return "—";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(parsed);
}

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function quoteValue(usd: number | null | undefined, quote: number | null | undefined, pairLabel: string) {
  return usd != null ? money(usd) : quote != null ? `${number(quote, 8)} ${pairLabel}` : "—";
}

function basisValue(value: number | null, currency: string) {
  if (value == null) return "—";
  return currency === "USD" ? money(value) : `${number(value, 8)} ${currency}`;
}

function exampleHolderReport(): ExitReport {
  const amount = 250_000;
  const tokenDepth = 1_000_000;
  const quoteDepthUsd = 25_000;
  const priceUsd = quoteDepthUsd / tokenDepth;
  const feeBps = 250;
  const quotes = [0.1, 0.25, 0.5, 1].map((fraction) => {
    const tokenAmount = amount * fraction;
    const netInput = tokenAmount * (1 - feeBps / 10_000);
    const proceedsUsd = (netInput * quoteDepthUsd) / (tokenDepth + netInput);
    const spotValueUsd = tokenAmount * priceUsd;
    return {
      fraction,
      tokenAmount: String(tokenAmount),
      spotValueQuote: spotValueUsd,
      proceedsQuote: proceedsUsd,
      spotValueUsd,
      proceedsUsd,
      haircutPct: (1 - proceedsUsd / spotValueUsd) * 100,
    };
  });
  return {
    observedAt: "2026-01-01T00:00:00.000Z",
    evidence: { mode: "demo", blockNumber: null, poolId: null, sources: [] },
    token: { address: "0x2222222222222222222222222222222222222222", name: "HOP OUT Example", symbol: "HOPOUT", decimals: 18 },
    position: { source: "wallet", wallet: "0x1111111111111111111111111111111111111111", amount: String(amount), sellableAmount: String(amount), sellableCapped: false },
    market: { phase: 2, phaseLabel: "Synthetic pool", venue: "uniswap-v4-depth", pairLabel: "USDC", priceInPair: priceUsd, priceUsd, liquidityUsd: quoteDepthUsd * 2, volume24hUsd: null, totalFeeBps: feeBps },
    method: { precision: "market-depth-estimate", label: "Synthetic holder example", note: "EXAMPLE DATA: invented balance, depth and price. This shows the holder flow and does not represent a deployed token or live market." },
    quotes,
    links: { explorer: "", market: null },
  };
}

export default function HoldersPage() {
  const [wallet, setWallet] = useState("");
  const [report, setReport] = useState<ExitReport | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [costBasis, setCostBasis] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const runCheck = useCallback(async (address: string) => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/holder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const payload = await response.json() as ExitReport | { error?: string; code?: string };
      if (!response.ok) {
        if ("code" in payload && payload.code === "TOKEN_UNAVAILABLE") {
          setConfigured(false);
          return;
        }
        throw new Error("error" in payload && payload.error ? payload.error : "Could not read this holder position.");
      }
      setReport(payload as ExitReport);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read this holder position.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/holder")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<HolderStatus>;
      })
      .then((status) => { if (active) setConfigured(status.ready); })
      .catch(() => { if (active) setError("Could not read the $HOPOUT launch status."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const handleAccounts = (accounts: string[]) => {
      const address = typeof accounts[0] === "string" ? accounts[0] : "";
      setWallet(address);
      setReport(null);
      setError("");
      if (address) void runCheck(address);
    };
    void provider.request({ method: "eth_accounts" }).then((accounts) => {
      if (Array.isArray(accounts)) handleAccounts(accounts.filter((account): account is string => typeof account === "string"));
    }).catch(() => undefined);
    provider.on?.("accountsChanged", handleAccounts);
    return () => provider.removeListener?.("accountsChanged", handleAccounts);
  }, [runCheck]);

  async function connect() {
    if (!window.ethereum) {
      setError("No browser wallet found. Install an EVM wallet or use the terminal with a public address.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
      if (!address) throw new Error("No account was returned by the wallet.");
      setWallet(address);
      void runCheck(address);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection was cancelled.");
    } finally {
      setConnecting(false);
    }
  }

  function clearWallet() {
    setWallet("");
    setReport(null);
    setError("");
    setCostBasis("");
  }

  function toggleExample() {
    if (report?.evidence.mode === "demo") {
      setReport(null);
      setCostBasis("");
      return;
    }
    setWallet("");
    setError("");
    setCostBasis("3800");
    setReport(exampleHolderReport());
  }

  const full = report?.quotes.find((quote) => quote.fraction === 1) ?? null;
  const cost = costBasis.trim() === "" ? null : Number(costBasis);
  const validCost = cost != null && Number.isFinite(cost) && cost >= 0 ? cost : null;
  const basisCurrency = full?.proceedsUsd != null ? "USD" : report?.market.pairLabel ?? "USD / QUOTE";
  const exitProceeds = full ? full.proceedsUsd ?? full.proceedsQuote : null;
  const pnl = exitProceeds != null && validCost != null ? exitProceeds - validCost : null;
  const pnlPercent = pnl != null && validCost != null && validCost > 0 ? (pnl / validCost) * 100 : null;
  const state = useMemo(() => {
    if (loading) return ["READING POSITION", "loading"];
    if (error) return ["CHECK FAILED", "error"];
    if (report?.evidence.mode === "demo") return ["SYNTHETIC EXAMPLE", "pending"];
    if (report) return ["LIVE SNAPSHOT", "live"];
    if (configured === false) return ["TOKEN UNAVAILABLE", "error"];
    if (wallet) return ["WALLET READY", "ready"];
    return ["WAITING FOR WALLET", "idle"];
  }, [configured, error, loading, report, wallet]);
  const isExample = report?.evidence.mode === "demo";

  return (
    <main className="holder-app">
      <header className="holder-header">
        <a className="tool-logo" href="/" aria-label="HOP OUT home">
          <Image src="/hop-out-toad-cutout.png" width={42} height={42} alt="" priority />
          <span><b>HOP OUT</b><small>HOLDER EXIT DESK</small></span>
        </a>
        <div className="holder-command"><span>holder@rh:~$</span> check --token HOPOUT --holder</div>
        <a className="holder-back" href="/"><ArrowLeft size={14} /> HOME</a>
      </header>

      <section className="holder-workspace">
        <aside className="holder-connect">
          <p className="section-index">01 / IDENTIFY THE HOLDER</p>
          <h1>CONNECT.<br /><span>CHECK THE DOOR.</span></h1>
          <p className="holder-lead">Connect an EVM wallet. HOP OUT uses only its public address to read the official $HOPOUT balance on Robinhood Chain.</p>

          <TokenContract className="holder-token-ca" />
          <a className="holder-token-link" href={PROJECT_LINKS.pons} target="_blank" rel="noreferrer">VIEW OFFICIAL TOKEN ON PONS <ExternalLink size={12} /></a>

          {!wallet ? (
            <button className="holder-connect-button" type="button" onClick={() => void connect()} disabled={connecting}>
              {connecting ? <LoaderCircle className="spin" size={18} /> : <Wallet size={18} />}
              {connecting ? "WAITING FOR WALLET..." : "CONNECT WALLET"}
            </button>
          ) : (
            <div className="holder-wallet-card">
              <div><span>CONNECTED ADDRESS</span><b><i /><code>{short(wallet, 8)}</code></b></div>
              <p>{wallet}</p>
              <div className="holder-wallet-actions">
                <button type="button" onClick={() => void runCheck(wallet)} disabled={loading || !configured}><RefreshCw className={loading ? "spin" : ""} size={14} /> CHECK AGAIN</button>
                <button type="button" onClick={clearWallet}><X size={14} /> CLEAR</button>
              </div>
            </div>
          )}

          <button className="holder-example-button" type="button" onClick={toggleExample} disabled={loading}>
            {isExample ? "CLOSE EXAMPLE" : "VIEW EXAMPLE RECEIPT"}
          </button>

          <label className="holder-cost">
            <span>YOUR COST BASIS <small>OPTIONAL / {basisCurrency}</small></span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={costBasis}
              onChange={(event) => setCostBasis(event.target.value)}
              placeholder={`What you paid in ${basisCurrency}`}
            />
            <p>Use the currency shown above. Without your cost basis, HOP OUT will not invent a profit number.</p>
          </label>

          {error && <p className="holder-error" role="alert">{error}</p>}

          <div className="holder-boundary">
            <ShieldCheck size={20} />
            <div><b>ADDRESS ONLY</b><p>No signature, approval, private key, network switch or transaction request.</p></div>
          </div>
        </aside>

        <section className="holder-receipt" aria-live="polite">
          <div className="holder-receipt-head">
            <span>02 / HOLDER RECEIPT</span>
            <b className={state[1]}><i /> {state[0]}</b>
          </div>

          {report ? (
            <div className="holder-report">
              <div className="holder-identity">
                <div><span>STATUS</span><strong><Check size={13} /> {isExample ? "EXAMPLE" : "HOLDER"}</strong><small>{isExample ? "synthetic balance" : "balance found"}</small></div>
                <div><span>WALLET</span><strong>{short(report.position.wallet || wallet, 8)}</strong><small>{isExample ? "example address" : "public address"}</small></div>
                <div><span>TOKEN</span><strong>${report.token.symbol}</strong><small>{short(report.token.address)}</small></div>
                <div><span>OBSERVED</span><strong>{isExample ? "DEMO" : "LIVE"}</strong><small>{isExample ? "not market data" : new Date(report.observedAt).toLocaleTimeString()}</small></div>
              </div>

              <div className="holder-metrics">
                <div><span>YOU HOLD</span><strong>{number(report.position.amount, 6)}</strong><small>${report.token.symbol}</small></div>
                <div className="holder-sellable"><span>MAX SELLABLE NOW</span><strong>{number(report.position.sellableAmount, 6)}</strong><small>{report.position.sellableCapped ? "limited by real curve reserves" : "whole wallet balance"}</small></div>
                <div><span>{report.position.sellableCapped ? "SELLABLE VALUE" : "SCREEN VALUE"}</span><strong>{quoteValue(full?.spotValueUsd, full?.spotValueQuote, report.market.pairLabel)}</strong><small>last-price reference</small></div>
                <div className="holder-exit"><span>EST. EXIT PROCEEDS</span><strong>{quoteValue(full?.proceedsUsd, full?.proceedsQuote, report.market.pairLabel)}</strong><small>{report.position.sellableCapped ? "current sellable amount" : "whole wallet balance"}</small></div>
                <div className="holder-haircut"><span>EXIT HAIRCUT</span><strong>{number(full?.haircutPct, 2)}%</strong><small>impact + modeled fees</small></div>
              </div>

              <div className={`holder-pnl ${pnl == null ? "empty" : pnl >= 0 ? "positive" : "negative"}`}>
                <div>
                  <span>EST. EXIT P&amp;L VS YOUR COST BASIS</span>
                  <strong>{pnl == null ? "ADD COST BASIS" : basisValue(pnl, basisCurrency)}</strong>
                </div>
                <div>
                  <span>RETURN AFTER EST. EXIT</span>
                  <strong>{pnlPercent == null ? "—" : `${pnlPercent >= 0 ? "+" : ""}${number(pnlPercent, 2)}%`}</strong>
                </div>
                <p>{pnl == null ? `Enter what you paid in ${basisCurrency} to calculate this field.` : `${basisValue(exitProceeds, basisCurrency)} estimated exit − ${basisValue(validCost, basisCurrency)} entered cost basis.`} Not tax or accounting data.</p>
              </div>

              <div className="holder-table-wrap">
                <table className="holder-exit-table">
                  <caption className="sr-only">Estimated holder proceeds by independent exit size</caption>
                  <thead><tr><th>EXIT</th><th>TOKENS</th><th>SCREEN VALUE</th><th>EST. PROCEEDS</th><th>HAIRCUT</th></tr></thead>
                  <tbody>{report.quotes.map((quote) => (
                    <tr key={quote.fraction}>
                      <th scope="row">{quote.fraction * 100}%<small>{quote.fraction === 1 ? "FULL BAG" : "INDEPENDENT"}</small></th>
                      <td>{number(quote.tokenAmount, 6)}</td>
                      <td>{quote.spotValueUsd == null ? `${number(quote.spotValueQuote, 8)} ${report.market.pairLabel}` : money(quote.spotValueUsd)}</td>
                      <td>{quote.proceedsUsd == null ? `${number(quote.proceedsQuote, 8)} ${report.market.pairLabel}` : money(quote.proceedsUsd)}</td>
                      <td className={(quote.haircutPct ?? 0) >= 15 ? "hot" : ""}>{number(quote.haircutPct, 2)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              <div className="holder-method">
                <ShieldCheck size={16} />
                <p><b>{report.method.label}.</b> {report.method.note}</p>
                <div>
                  {report.links.explorer && <a href={report.links.explorer} target="_blank" rel="noreferrer">EXPLORER <ExternalLink size={12} /></a>}
                  {report.links.market && <a href={report.links.market} target="_blank" rel="noreferrer">MARKET <ExternalLink size={12} /></a>}
                </div>
              </div>
            </div>
          ) : (
            <div className="holder-empty">
              {loading ? <LoaderCircle className="spin" size={72} /> : <Image src="/hop-out-toad-cutout.png" width={112} height={112} alt="" />}
              <div>
                <span>{loading ? "READING OFFICIAL TOKEN BALANCE" : configured === false ? "OFFICIAL TOKEN UNAVAILABLE" : error ? "POSITION UNAVAILABLE" : wallet ? "WALLET CONNECTED" : "WAITING FOR WALLET"}</span>
                <h2>{loading ? "MEASURING THE WHOLE BAG." : configured === false ? "THE CHECK IS TEMPORARILY OFFLINE." : error ? "THE CHECK STOPPED." : "YOUR BAG. ITS REAL EXIT."}</h2>
                <p>{loading
                  ? "Reading the public balance and calculating four independent exit sizes."
                  : configured === false
                    ? "The official $HOPOUT contract could not be loaded by this build."
                    : error
                      ? error
                      : "Connect a wallet to compare its $HOPOUT screen value with estimated proceeds at 10%, 25%, 50% and 100%."
                }</p>
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className="holder-footer">
        <span>$HOPOUT / HOLDER MODE / V0.3</span>
        <a href="/terminal">CHECK ANOTHER TOKEN ↗</a>
        <span>ESTIMATE ONLY / NO TRADES</span>
      </footer>
    </main>
  );
}
