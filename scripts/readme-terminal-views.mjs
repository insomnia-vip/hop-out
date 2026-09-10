import { marketDepthQuote, percentageDifference } from "../lib/hopout/math.mjs";

/** Dense, static documentation views. They do not advertise a watch/stream CLI. */
export function terminalViews({ live, demo, text, wordmark, esc }) {
  const green = "#baff00", white = "#d0d6cc", muted = "#83907b", yellow = "#eeff00";
  const cyan = "#60cbd1", red = "#ff8562", rule = "#354030";
  const t = (x, y, s, color = white, size = 14, extra = "") => text(x, y, s, size, color, `xml:space="preserve" ${extra}`);
  const h = (y, x1 = 20, x2 = 1480) => `<path d="M${x1} ${y}H${x2}" stroke="${rule}"/>`;
  const v = (x, y1, y2) => `<path d="M${x} ${y1}V${y2}" stroke="${rule}"/>`;
  const block = (x, y, w, height, color) => `<rect x="${x}" y="${y}" width="${w}" height="${height}" fill="${color}"/>`;
  const fixed = (value, digits = 4) => Number(value).toFixed(digits);
  const fmt = (value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const date = (value) => new Date(value).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  function brand(x, y, scale) {
    const glyphs = wordmark(x, y, scale);
    return `<g transform="translate(7 8)">${glyphs.replaceAll('fill="#caff38"', `fill="#071006" stroke="${green}" stroke-width="1"`)}</g>`
      + `<g transform="translate(3 4)">${glyphs.replaceAll('fill="#caff38"', 'fill="#5d7900"')}</g>`
      + glyphs.replaceAll('fill="#caff38"', 'fill="url(#pixel-type)"');
  }
  function svg(width, height, title, desc, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>
<defs><linearGradient id="pixel-type" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#baff00"/><stop offset="1" stop-color="#e6ff19"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="#080c07"/>
<g font-family="Consolas,DejaVu Sans Mono,monospace">${body}</g></svg>\n`;
  }
  function cells(x, y, ratio, width = 188, height = 11, count = 36) {
    let result = "";
    for (let i = 0; i < count; i++) {
      result += block(x + i * width / count, y, width / count - 1, height, (i + .5) / count <= ratio ? green : red);
    }
    return result;
  }

  const scenarios = Array.from({ length: 24 }, (_, i) => {
    const amount = (i + 1) * 25000;
    const spot = amount * .00001;
    const out = marketDepthQuote(amount, 1000000, 10, 250);
    return { amount, spot, out, haircut: percentageDifference(spot, out), retained: out / spot };
  });
  const selected = scenarios.find((row) => row.amount === 500000);
  let desk = t(20, 25, "HOP OUT // EXIT LIQUIDITY     robinhood chain     local calculation", muted, 13)
    + t(1480, 25, "OFFLINE STUDY / SYNTHETIC DATA", yellow, 13, 'text-anchor="end"') + h(38)
    + brand(20, 58, 12)
    + t(20, 169, "big bag. small door. / read the pool, not the post", muted, 15)
    + t(866, 68, "HOP OUT ENGINE  /  PUBLISHED-DEPTH MODEL", green, 14)
    + t(866, 88, "mode DEMO     token POND     chain 4663", white)
    + t(866, 108, "reserve 1,000,000 POND / 10 ETH     fees 2.50%", white)
    + t(866, 128, "24 independent amounts / same starting reserves", muted)
    + t(866, 148, "no signer / no trades / no provider calls", green)
    + t(866, 168, "documentation illustration / not a running TUI", muted, 13)
    + h(188) + v(847, 48, 944)
    + t(20, 209, "SCENARIO MATRIX", muted, 13) + t(187, 209, "ALL", yellow, 13)
    + t(227, 209, "independent sells / not a sequence of trades", muted, 13)
    + t(20, 235, "ID", muted, 13) + t(68, 235, "ASSET", muted, 13) + t(163, 235, "TOKENS IN", muted, 13)
    + t(288, 235, "SPOT ETH", muted, 13) + t(410, 235, "OUT ETH", muted, 13)
    + t(529, 235, "HAIRCUT", muted, 13) + t(640, 235, "RETAINED / LOST", muted, 13);
  scenarios.forEach((row, i) => {
    const y = 259 + i * 17;
    if (row.amount === 500000) desk += block(15, y - 13, 821, 17, "#1b260c");
    desk += t(20, y, String(i + 1).padStart(2, "0"), muted, 13)
      + t(68, y, "POND", green, 13) + t(163, y, fmt(row.amount), white, 13)
      + t(288, y, fixed(row.spot), white, 13) + t(410, y, fixed(row.out), cyan, 13)
      + t(529, y, fixed(row.haircut, 2) + "%", row.haircut > 15 ? red : yellow, 13)
      + cells(640, y - 10, row.retained);
  });
  desk += h(677, 20, 837)
    + t(20, 699, "SELECTED BAG / FOUR EXIT SIZES", muted, 13) + t(445, 699, "500,000 POND", yellow, 13)
    + t(20, 725, "SELL", muted, 13) + t(110, 725, "INPUT POND", muted, 13)
    + t(290, 725, "SPOT USD", muted, 13) + t(437, 725, "OUT USD", muted, 13)
    + t(582, 725, "RETURN / SPOT", muted, 13);
  demo.quotes.forEach((q, i) => {
    const y = 752 + i * 34;
    desk += t(20, y, `${q.fraction * 100}%`, green) + t(110, y, fmt(q.tokenAmount))
      + t(290, y, "$" + fmt(q.spotValueUsd)) + t(437, y, "$" + fmt(q.proceedsUsd), cyan)
      + cells(582, y - 11, q.proceedsQuote / q.spotValueQuote, 180, 12)
      + t(773, y, fixed(100 - q.haircutPct, 1) + "%", green, 13);
  });
  desk += h(880, 20, 837)
    + t(20, 902, "QUOTE MODEL", muted, 13)
    + t(147, 902, "net = amount * (1 - feeBps / 10000)", white, 14)
    + t(147, 924, "out = net * quoteReserve / (tokenReserve + net)", cyan, 14);

  const side = (y, name) => t(866, y, name, muted, 13);
  desk += side(209, "SELECTED / 20") + t(866, 235, "POND    500,000 tokens    SYNTHETIC", yellow, 15)
    + t(866, 260, "screen value  5.0000 ETH / $10,000.00")
    + t(866, 280, `est. exit     ${fixed(selected.out)} ETH / $${fmt(selected.out * 2000)}`, green)
    + t(866, 300, `haircut       ${fixed(selected.haircut, 2)}% incl. modeled fees`, red)
    + t(866, 320, "reference     0.00001000 ETH / POND", muted)
    + h(338, 858, 1480) + side(358, "CALCULATION INPUTS")
    + t(866, 383, "token depth     1,000,000 POND")
    + t(866, 403, "quote depth     10.0000 ETH")
    + t(866, 423, "quote USD       $2,000 / ETH   [invented]")
    + t(866, 443, "fee multiplier  0.9750")
    + t(866, 463, "pool model      constant-product approximation", muted)
    + h(481, 858, 1480) + side(501, "EXIT RECEIPT / RETAINED VALUE");
  demo.quotes.forEach((q, i) => {
    const y = 527 + i * 23;
    desk += t(866, y, `${String(q.fraction * 100).padStart(3)}%`, green)
      + cells(915, y - 11, q.proceedsQuote / q.spotValueQuote, 314, 12, 54)
      + t(1247, y, fixed(100 - q.haircutPct, 2) + "% of spot", white);
  });
  desk += h(617, 858, 1480) + side(638, "BOUNDARIES")
    + t(866, 663, "[READ]  token amount or public wallet", green)
    + t(866, 684, "[MATH]  four sale sizes / reproducible output", green)
    + t(866, 705, "[NONE]  wallet connect / approvals / signing", muted)
    + t(866, 726, "[NONE]  executable quote / protection from loss", muted)
    + h(745, 858, 1480) + side(766, "REPRODUCE THE DEMO")
    + t(866, 792, "$ pnpm demo", yellow)
    + t(866, 814, "$ pnpm hop demo --format json", yellow)
    + t(866, 836, "$ pnpm hop demo --format markdown", yellow)
    + side(875, "SOURCE")
    + t(866, 899, "lib/hopout/demo.ts  +  lib/hopout/math.mjs", cyan)
    + t(866, 921, "Static study. No live market or uptime claims.", muted, 13)
    + h(946) + t(20, 974, "hop-out@local:~$", white, 14) + block(162, 961, 9, 15, green)
    + t(1480, 974, "DEMO / 24 SCENARIOS / 0 TRANSACTIONS", yellow, 13, 'text-anchor="end"');

  const q = live.quotes.at(-1);
  const strip = brand(20, 17, 13)
    + t(20, 137, "the read-only exit-liquidity terminal for Pons V2 on Robinhood Chain", muted, 16)
    + t(20, 177, "hop-out inspect", green, 17)
    + t(187, 177, "pons v2 / Robinhood Chain (4663) / no signer", white, 17)
    + block(757, 158, 108, 24, green) + t(766, 176, "READ ONLY", "#080c07", 16)
    + t(884, 177, "CAPTURED SNAPSHOT", yellow, 15)
    + t(20, 204, `${date(live.observedAt)} / ${live.token.symbol} / ${live.market.phaseLabel}`, muted, 15)
    + h(222, 20, 1180)
    + t(20, 248, "COPY", white, 18, 'font-weight="bold"')
    + t(103, 248, "0xac7925...a2d7b1e", muted, 16)
    + t(302, 248, "POOL", cyan, 17) + t(382, 248, "HISTORICAL", yellow, 17)
    + t(557, 248, "1 position / 4 exits / 0 transactions", white, 16)
    + t(39, 277, `bag ${fmt(live.position.amount)} COPY   spot ${fixed(q.spotValueQuote, 8)} ETH   est. exit ${fixed(q.proceedsQuote, 8)} ETH`, white, 16)
    + t(39, 303, `pool $${fmt(live.market.liquidityUsd)}   24h vol $${fmt(live.market.volume24hUsd)}   fees ${fixed(live.market.totalFeeBps / 100, 2)}%`, white, 16)
    + t(39, 329, "retained", muted, 16) + cells(123, 317, q.proceedsQuote / q.spotValueQuote, 260, 15, 55)
    + t(402, 329, `${fixed(100 - q.haircutPct, 2)}% kept / haircut ${fixed(q.haircutPct, 2)}% / est. exit $${fmt(q.proceedsUsd)}`, green, 16)
    + t(39, 356, "read complete / published-depth approximation / not an executable quote", muted, 15)
    + h(381, 20, 1180)
    + t(20, 411, "SNAPSHOT", green, 17)
    + t(123, 411, "Captured public data, not a live feed. Pool state can change.", white, 16)
    + t(20, 447, "static documentation view / source: assets/readme/live-snapshot.json", muted, 14);
  return {
    "terminal-desk.svg": svg(1500, 995, "HOP OUT — dense offline terminal study", "Static documentation illustration of 24 independently calculated synthetic POND sale sizes, with a selected 500,000-token position. This is not an available live dashboard or a trade log.", desk),
    "terminal-snapshot.svg": svg(1200, 467, "HOP OUT — compact captured terminal receipt", `Static terminal-style documentation view of COPY data captured ${date(live.observedAt)}. Historical estimated full-sale proceeds ${q.proceedsQuote} ETH. Not a live feed or executable quote.`, strip),
  };
}
