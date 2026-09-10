import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Code2, ShieldCheck, Terminal, Zap } from "lucide-react";

const checks = [
  ["10%", "FIRST HOP", "tests the easy exit"],
  ["25%", "REAL SIZE", "shows early slippage"],
  ["50%", "TIGHT DOOR", "exposes shallow depth"],
  ["100%", "FULL BAG", "reveals the actual exit"],
];

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="HOP OUT home">
          <span className="status-dot" />
          HOP OUT <i>{"//"}</i> RH CHAIN
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#product">THE PRODUCT</a>
          <a href="#how-it-works">HOW IT WORKS</a>
          <Link href="/docs">DOCS</Link>
          <a href="https://github.com/insomnia-vip/hop-out" target="_blank" rel="noreferrer">GITHUB ↗</a>
        </nav>
        <Link className="nav-terminal" href="/terminal">OPEN TERMINAL <ArrowRight size={15} /></Link>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="landing-kicker"><span>READ ONLY</span> EXIT LIQUIDITY / ROBINHOOD CHAIN 4663</p>
          <h1><span>BIG BAG.</span><em>SMALL DOOR.</em></h1>
          <p className="hero-deck">
            Your chart prices one token. HOP OUT tests the whole position against the liquidity that has to absorb it.
          </p>
          <div className="hero-actions">
            <Link className="primary-cta" href="/terminal"><Terminal size={18} /> OPEN TERMINAL <ArrowRight size={18} /></Link>
            <a className="secondary-cta" href="https://github.com/insomnia-vip/hop-out" target="_blank" rel="noreferrer"><Code2 size={17} /> VIEW SOURCE</a>
          </div>
          <div className="safety-rail" aria-label="Safety boundaries">
            <span>NO WALLET CONNECT</span><span>NO PRIVATE KEYS</span><span>NO TRADES</span>
          </div>
        </div>

        <div className="door-stage" aria-label="Animated HOP OUT frog testing four exit sizes">
          <div className="stage-top"><span>FROG RUN / EXIT ROUTE</span><b>LOOP ACTIVE</b></div>
          <div className="frog-bay">
            <div className="hop-points" aria-hidden="true">
              {checks.map(([size], index) => <span key={size} className={index === 3 ? "active" : ""}><b>{size}</b><i /></span>)}
            </div>
            <div className="jumping-frog">
              <Image src="/hop-out-toad.png" width={190} height={190} alt="HOP OUT pixel frog jumping toward the exit" priority />
              <span>TESTING THE DOOR</span>
            </div>
            <div className="floor-grid" />
          </div>
          <div className="exit-door">
            <span>EXIT GATE</span>
            <strong>DOOR 04</strong>
            <small>FULL BAG CHECK</small>
            <i>→</i>
          </div>
          <div className="stage-bottom"><span>HOP 01—04</span><b>10 / 25 / 50 / 100%</b></div>
        </div>
      </section>

      <section className="statement-band">
        <span>SPOT PRICE</span><b>IS A POSTER.</b><span>EXIT LIQUIDITY</span><b>IS THE DOOR.</b>
      </section>

      <section className="landing-product" id="product">
        <div className="product-copy">
          <p className="section-index">01 / THE PRODUCT</p>
          <h2>THE RECEIPT<br />ENDS THE ARGUMENT.</h2>
          <p>
            Enter a Pons V2 token and an amount—or a public wallet. HOP OUT returns four independent exit estimates, the modeled haircut, and the market state behind the answer.
          </p>
          <Link className="text-link" href="/terminal">RUN A POSITION <ArrowRight size={17} /></Link>
        </div>

        <div className="receipt-preview">
          <div className="preview-head"><span>$COPY / SAMPLE INPUT</span><b>READ ONLY</b></div>
          <div className="preview-value">
            <div><span>SCREEN VALUE</span><strong>$24,800</strong></div>
            <i>→</i>
            <div><span>EST. FULL EXIT</span><strong>$14,930</strong></div>
          </div>
          <div className="preview-labels"><span>SELL</span><span>DOOR STATUS</span><span>RETAINED</span></div>
          {checks.map(([size, label], index) => (
            <div className="preview-row" key={size}>
              <b>{size}</b>
              <span>{label}</span>
              <i><em style={{ width: `${94 - index * 11}%` }} /></i>
            </div>
          ))}
          <div className="preview-foot">SAMPLE NUMBERS / THE TERMINAL READS CURRENT PUBLIC STATE</div>
        </div>
      </section>

      <section className="landing-method" id="how-it-works">
        <div className="method-title">
          <p className="section-index">02 / HOW IT WORKS</p>
          <h2>ONE POSITION.<br />FOUR DOORS.</h2>
        </div>
        <div className="landing-steps">
          {checks.map(([size, label, copy], index) => (
            <article key={size}>
              <div><span>0{index + 1}</span><b>{size}</b></div>
              <h3>{label}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-callout">
        <div>
          <Image src="/hop-out-toad.png" width={112} height={112} alt="" />
          <p><Zap size={16} /> THE DOOR IS OPEN</p>
        </div>
        <h2>KNOW THE EXIT<br />BEFORE THE CROWD.</h2>
        <Link className="primary-cta" href="/terminal">OPEN TERMINAL <ArrowRight size={18} /></Link>
      </section>

      <footer className="landing-footer">
        <span>HOP OUT / 2026</span>
        <p><ShieldCheck size={15} /> ESTIMATES, NOT EXECUTION OR FINANCIAL ADVICE</p>
        <div><Link href="/docs">DOCS</Link><a href="https://github.com/insomnia-vip/hop-out" target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></div>
      </footer>
    </main>
  );
}
