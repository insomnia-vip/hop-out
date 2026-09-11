/* eslint-disable @next/next/no-html-link-for-pages -- Vinext Link navigation throws at runtime; hard navigations are intentional. */
import { ArrowRight, Code2, ShieldCheck, Terminal } from "lucide-react";
import { PROJECT_LINKS } from "@/lib/hopout/links";

const exits = [
  ["10%", "First hop", "A small sale that establishes the easy-exit baseline."],
  ["25%", "Real size", "A larger sale that begins to expose price impact."],
  ["50%", "Tight door", "Half the position tested independently against the same state."],
  ["100%", "Full bag", "The complete position tested as one exit—not four partial fills."],
];

export default function DocsPage() {
  return (
    <main className="docs-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/"><span className="status-dot" /> HOP OUT <i>{"//"}</i> DOCS</a>
        <nav aria-label="Documentation navigation">
          <a href="/#how-it-works">HOW IT WORKS</a>
          <a href="/terminal">TERMINAL</a>
          <a href="/holders">HOLDERS</a>
        </nav>
        <div className="site-actions">
          <a href={PROJECT_LINKS.github} target="_blank" rel="noreferrer">GITHUB ↗</a>
          <a href={PROJECT_LINKS.twitter} target="_blank" rel="noreferrer" title="Follow $HOPOUT launch status on X">TWITTER ↗</a>
          <a className="buy-token" href={PROJECT_LINKS.pons} target="_blank" rel="noreferrer" title="Open Pons and verify the official contract before trading">BUY $HOPOUT <span>↗</span></a>
        </div>
      </header>
      <div className="token-rail">
        <div>
          <span className="token-live"><b>$HOPOUT</b> PRE-LAUNCH</span>
          <i />
          <span className="token-ca"><small>CA</small><code>PENDING — NOT PUBLISHED</code></span>
          <div className="token-rail-actions">
            <a href={PROJECT_LINKS.twitter} target="_blank" rel="noreferrer">FOLLOW LAUNCH ↗</a>
            <a href={PROJECT_LINKS.pons} target="_blank" rel="noreferrer">OPEN PONS ↗</a>
          </div>
        </div>
      </div>

      <div className="docs-shell">
        <aside className="docs-rail">
          <span>CONTENTS</span>
          <a href="#overview">01 / OVERVIEW</a>
          <a href="#input">02 / INPUT</a>
          <a href="#receipt">03 / RECEIPT</a>
          <a href="#method">04 / METHOD</a>
          <a href="#safety">05 / SAFETY</a>
        </aside>

        <article className="docs-main">
          <section className="docs-intro" id="overview">
            <p className="section-index">HOP OUT / DOCUMENTATION</p>
            <h1>READ THE DOOR.<br />THEN DECIDE.</h1>
            <p>HOP OUT is an exit-liquidity tool for Pons V2 tokens on Robinhood Chain. It compares a position&apos;s spot value with estimated proceeds at four independent sale sizes.</p>
            <a className="primary-cta" href="/terminal"><Terminal size={17} /> RUN THE TOOL <ArrowRight size={17} /></a>
          </section>

          <section className="docs-section" id="input">
            <div className="docs-number">02</div>
            <div>
              <h2>INPUT</h2>
              <p>Provide a token contract plus either a token amount or a public wallet address. The separate Holder Check can request an EVM account and uses only the returned public address to read its $HOPOUT balance.</p>
              <dl className="docs-spec">
                <div><dt>TOKEN</dt><dd>Pons V2 contract address</dd></div>
                <div><dt>AMOUNT</dt><dd>Exact token quantity to test</dd></div>
                <div><dt>WALLET</dt><dd>Optional public balance source</dd></div>
              </dl>
            </div>
          </section>

          <section className="docs-section" id="receipt">
            <div className="docs-number">03</div>
            <div>
              <h2>THE RECEIPT</h2>
              <p>Every result keeps the observed market state, method label, fee assumptions, proceeds estimate, and haircut visible together.</p>
              <div className="docs-exits">
                {exits.map(([size, name, copy]) => <div key={size}><b>{size}</b><span>{name}</span><p>{copy}</p></div>)}
              </div>
            </div>
          </section>

          <section className="docs-section" id="method">
            <div className="docs-number">04</div>
            <div>
              <h2>METHOD</h2>
              <p>Curve launches use block-pinned on-chain reserves and fee reads. Graduated launches use the canonical published pool and a clearly labelled market-depth approximation.</p>
              <div className="docs-formula">
                <span>SCREEN VALUE</span><b>−</b><span>EST. PROCEEDS</span><b>=</b><span>EXIT HAIRCUT</span>
              </div>
            </div>
          </section>

          <section className="docs-section docs-safety" id="safety">
            <div className="docs-number">05</div>
            <div>
              <h2>SAFETY BOUNDARY</h2>
              <p><ShieldCheck size={17} /> The terminal needs no wallet connection. Holder Check can request a public EVM address, but never a signature, approval, transaction, private key, or custody. Estimates can change as pool state moves and are not executable quotes or financial advice.</p>
              <a className="text-link" href={PROJECT_LINKS.github} target="_blank" rel="noreferrer"><Code2 size={16} /> READ THE SOURCE</a>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
