import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { demoReport } from "../.hopout-build/demo.js";
import { terminalViews } from "./readme-terminal-views.mjs";

// Documentation artwork, not a screenshot of a separate dashboard or TUI.
// SVG is deliberate: commands remain crisp at any GitHub zoom level.
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "assets/readme");
const token = "0xac79255f6f404eba14f316e8669d76573a2d7b1e";
await mkdir(directory, { recursive: true });

function cli(args, allowedCodes = [0]) {
  const result = spawnSync(process.execPath, ["bin/hop-out.mjs", ...args], {
    cwd: root, encoding: "utf8", timeout: 60_000,
  });
  if (result.error || !allowedCodes.includes(result.status)) {
    throw new Error(result.stderr || result.error?.message || "CLI capture failed");
  }
  return JSON.parse(result.stdout);
}

if (process.argv.includes("--refresh")) {
  const live = cli(["inspect", "--token", token, "--amount", "1000000", "--format", "json"]);
  const doctor = { capturedAt: new Date().toISOString(), ...cli(["doctor", "--format", "json"], [0, 2]) };
  await writeFile(path.join(directory, "live-snapshot.json"), JSON.stringify(live, null, 2) + "\n");
  await writeFile(path.join(directory, "doctor-snapshot.json"), JSON.stringify(doctor, null, 2) + "\n");
}

const live = JSON.parse(await readFile(path.join(directory, "live-snapshot.json"), "utf8"));
const doctor = JSON.parse(await readFile(path.join(directory, "doctor-snapshot.json"), "utf8"));
const demo = demoReport();
assert.equal(live.evidence.mode, "live");
assert.equal(live.token.address.toLowerCase(), token);
assert.equal(doctor.chainId, 4663);
assert.equal(doctor.checks.length, 3);
assert.ok(doctor.checks.every((check) => typeof check.ok === "boolean" && Number.isFinite(check.latencyMs)));

const c = { bg: "#090d09", surface: "#11190f", line: "#34452b", lime: "#caff38", text: "#e6eddd", dim: "#99ab8c", faint: "#627558", blue: "#8cddd4", orange: "#ff986a" };
const esc = (s) => String(s).replace(/[&<>"']/g, (v) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[v]);
const text = (x, y, s, size = 18, color = c.text, extra = "") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${esc(s)}</text>`;
const rect = (x, y, width, height, fill = c.surface, stroke = c.line) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3" fill="${fill}" stroke="${stroke}"/>`;
const line = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}H${x2}V${y2}" fill="none" stroke="${c.line}"/>`;
const label = (x, y, s, color = c.dim) => text(x, y, s, 14, color, 'letter-spacing="1.4"');
const n = (value, digits = 6) => value == null ? "unavailable" : Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
const usd = (value) => value == null ? "unavailable" : "$" + n(value, 2);
const utc = (s) => new Date(s).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
const short = (s) => s ? s.slice(0, 10) + "..." + s.slice(-8) : "not available";

// A small bitmap typeface for the brand wordmark; no embedded fonts or assets.
function wordmark(x, y, scale = 6) {
  const glyphs = {
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  };
  let svg = "", column = 0;
  for (const char of "HOP OUT") {
    if (char === " ") { column += 3; continue; }
    glyphs[char].forEach((row, j) => [...row].forEach((on, i) => {
      if (on === "1") svg += `<rect x="${x + (column + i) * scale}" y="${y + j * scale}" width="${scale}" height="${scale}" fill="${c.lime}"/>`;
    }));
    column += 6;
  }
  return svg;
}

function frame(height, title, badge, content, description) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc>
<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${c.lime}" stroke-opacity=".035"/></pattern></defs>
${rect(1, 1, 1198, height - 2, c.bg)}<rect x="2" y="2" width="1196" height="${height - 4}" fill="url(#grid)"/>
<g font-family="Consolas,Menlo,DejaVu Sans Mono,monospace">
${rect(1, 1, 1198, 54)}${[25, 45, 65].map((x) => `<circle cx="${x}" cy="28" r="5" fill="${c.faint}"/>`).join("")}
${text(90, 34, title, 16)}${text(1166, 34, badge, 13, c.lime, 'text-anchor="end" letter-spacing="1"')}
${content}</g></svg>\n`;
}

const full = live.quotes.at(-1);
let receipt = wordmark(36, 88, 7) + label(355, 102, "01 / LIVE EXIT RECEIPT", c.lime)
  + text(355, 133, "Read the pool. Measure the door.", 22)
  + label(36, 174, "CAPTURED " + utc(live.observedAt))
  + rect(36, 195, 1128, 70)
  + text(52, 237, `$ pnpm hop inspect --token ${token} --amount 1000000`, 17, c.lime)
  + rect(36, 290, 688, 334) + rect(748, 290, 416, 334)
  + label(58, 320, `${live.token.symbol} / ${n(live.position.amount)} TOKENS`)
  + label(58, 354, "SCREEN VALUE") + label(377, 354, "ESTIMATED EXIT")
  + text(58, 400, usd(full.spotValueUsd), 40)
  + text(377, 400, usd(full.proceedsUsd), 40, c.lime)
  + text(58, 428, `${n(full.spotValueQuote, 8)} ${live.market.pairLabel}`, 16, c.dim)
  + text(377, 428, `${n(full.proceedsQuote, 8)} ${live.market.pairLabel}`, 16, c.dim)
  + line(58, 447, 702, 447)
  + label(58, 474, "SELL") + label(195, 474, "SPOT") + label(375, 474, "EST. EXIT") + label(569, 474, "HAIRCUT");
live.quotes.forEach((q, i) => {
  const y = 505 + i * 30;
  receipt += text(58, y, `${q.fraction * 100}%`, 18, c.lime) + text(195, y, usd(q.spotValueUsd))
    + text(375, y, usd(q.proceedsUsd)) + text(569, y, `${n(q.haircutPct, 2)}%`, 18, c.orange);
});
receipt += label(770, 320, "SOURCE RECEIPT", c.lime)
  + text(770, 357, "CHAIN", 14, c.dim) + text(770, 382, "Robinhood / 4663", 20)
  + text(770, 421, "VENUE", 14, c.dim) + text(770, 446, "Pons V2 / graduated pool", 17)
  + text(770, 485, "CANONICAL POOL", 14, c.dim) + text(770, 510, short(live.evidence.poolId), 17, c.blue)
  + text(770, 549, "MODELED FEES", 14, c.dim) + text(770, 574, `${n(live.market.totalFeeBps / 100, 2)}% / published-depth estimate`, 16)
  + label(36, 662, "PONS API + DEXSCREENER / HISTORICAL SNAPSHOT")
  + text(36, 692, "Documentation view of real CLI data. Not a current or executable quote.", 16, c.dim);

let ladder = wordmark(36, 86, 6) + label(355, 101, "02 / EXIT LADDER", c.lime)
  + text(355, 133, "Same bag. Four different jumps.", 22)
  + rect(36, 164, 1128, 51) + text(54, 196, "$ pnpm hop demo", 18, c.lime)
  + text(1145, 196, "500,000 POND / fees 2.50% / invented pool", 17, c.dim, 'text-anchor="end"')
  + label(36, 253, "SELL") + label(166, 253, "PROCEEDS AS A SHARE OF SPOT VALUE")
  + label(779, 253, "EST. PROCEEDS") + label(1040, 253, "HAIRCUT");
demo.quotes.forEach((q, i) => {
  const y = 282 + i * 64, share = q.proceedsQuote / q.spotValueQuote;
  ladder += text(36, y + 24, `${q.fraction * 100}%`, 24, c.lime)
    + rect(166, y, 540, 32, "#4c3320", "none");
  // Discrete terminal cells make the retained/lost percentage easy to read.
  for (let j = 0; j < 54; j++) {
    ladder += rect(166 + j * 10, y, 7, 32, j / 54 < share ? c.lime : c.orange, "none");
  }
  ladder += text(779, y + 24, `${n(q.proceedsQuote, 4)} ETH`, 22)
    + text(1040, y + 24, `${n(q.haircutPct, 2)}%`, 22, c.orange);
});
ladder += line(36, 551, 1164, 551) + label(36, 584, "LIME = ESTIMATED RETURN / ORANGE = DIFFERENCE FROM SPOT")
  + text(36, 615, "DEMO: synthetic reserves and prices. No live token or trade is represented.", 16, c.dim);

const healthy = doctor.checks.every((check) => check.ok);
let diagnostic = wordmark(36, 86, 6) + label(355, 101, "03 / SOURCE DIAGNOSTICS", c.lime)
  + text(355, 133, "Check the inputs before the output.", 22)
  + rect(36, 164, 694, 302) + rect(754, 164, 410, 302)
  + text(58, 202, "$ pnpm doctor", 20, c.lime) + line(58, 224, 708, 224)
  + label(58, 254, "STATUS") + label(172, 254, "PROVIDER") + label(581, 254, "LATENCY");
doctor.checks.forEach((check, i) => {
  const y = 296 + i * 51;
  diagnostic += text(58, y, check.ok ? "[ OK ]" : "[FAIL]", 20, check.ok ? c.lime : c.orange)
    + text(172, y, check.name, 20) + text(581, y, `${check.latencyMs}ms`, 18, c.blue);
});
diagnostic += text(58, 442, healthy ? "3/3 source checks passed at capture time." : "Some sources were unavailable at capture time.", 16, healthy ? c.lime : c.orange)
  + label(776, 202, "READ-ONLY BOUNDARY", c.lime)
  + text(776, 252, "01  Public RPC reads", 19) + text(776, 289, "02  Public market data", 19) + text(776, 326, "03  No transaction path", 19)
  + line(776, 353, 1142, 353) + label(776, 386, "NO KEYS / NO SIGNER") + label(776, 417, "CHAIN ID / 4663")
  + text(36, 505, `CAPTURED ${utc(doctor.capturedAt)} / STATUS CAN CHANGE`, 15, c.dim);

const lastDemo = demo.quotes.at(-1);
const excerpt = {
  evidence: { mode: demo.evidence.mode, sources: demo.evidence.sources },
  token: { symbol: demo.token.symbol },
  position: demo.position,
  quotes: [{ fraction: lastDemo.fraction, tokenAmount: lastDemo.tokenAmount, proceedsQuote: lastDemo.proceedsQuote, haircutPct: lastDemo.haircutPct }],
};
let exported = label(36, 100, "04 / MACHINE-READABLE RECEIPTS", c.lime)
  + text(36, 140, "Keep the evidence with the numbers.", 27)
  + rect(36, 163, 1128, 51) + text(54, 196, "$ pnpm hop demo --format json --output demo.json", 19, c.lime)
  + rect(36, 237, 696, 524) + rect(756, 237, 408, 524)
  + label(58, 270, "demo.json / EXCERPT") + label(778, 270, "ONE REPORT. THREE FORMATS.", c.lime);
JSON.stringify(excerpt, null, 2).split("\n").forEach((value, i) => {
  const y = 301 + i * 18;
  exported += text(58, y, String(i + 1).padStart(2, "0"), 14, c.faint)
    + text(94, y, value, 16, value.includes(":") ? c.blue : c.dim, 'xml:space="preserve"');
});
exported += text(778, 330, "TEXT", 28) + text(778, 359, "Read it in your terminal.", 16, c.dim)
  + text(778, 418, "JSON", 28, c.blue) + text(778, 447, "Pipe it into your tools.", 16, c.dim)
  + text(778, 506, "MARKDOWN", 28, c.lime) + text(778, 535, "Share the full receipt.", 16, c.dim)
  + line(778, 568, 1142, 568) + label(778, 602, "EXCLUSIVE FILE WRITES")
  + text(778, 632, "Existing files are never", 16, c.dim) + text(778, 656, "silently overwritten.", 16, c.dim)
  + wordmark(778, 698, 5)
  + text(36, 800, "DEMO data / excerpt shows the 100% row; the full export contains all four exits.", 16, c.dim);

const images = {
  ...terminalViews({ live, demo, text, wordmark, esc }),
  "live-receipt.svg": frame(720, "hop-out / inspect", "CAPTURED LIVE DATA / READ ONLY", receipt, `Historical COPY exit estimate captured ${utc(live.observedAt)}: spot ${usd(full.spotValueUsd)}, estimated full exit ${usd(full.proceedsUsd)}. Not an executable quote.`),
  "exit-ladder.svg": frame(645, "hop-out / exit ladder", "SYNTHETIC DEMO / NO NETWORK", ladder, "Four synthetic sale sizes, 10, 25, 50 and 100 percent, with estimated proceeds and haircut. Larger sales lose more to price impact."),
  "doctor.svg": frame(535, "hop-out / doctor", "CAPTURED PROVIDER CHECK", diagnostic, `Provider diagnostics captured ${utc(doctor.capturedAt)}. ${doctor.checks.map((check) => `${check.name}: ${check.ok ? "OK" : "FAIL"}, ${check.latencyMs} milliseconds`).join("; ")}.`),
  "json-export.svg": frame(830, "hop-out / receipt export", "SYNTHETIC DEMO / JSON EXCERPT", exported, "A real subset of the synthetic JSON export, including demo provenance, position and the full-sale quote. JSON, text and Markdown exports are supported."),
};
for (const [filename, svg] of Object.entries(images)) {
  assert.ok(!/<script|foreignObject|(?:href|src)=|NaN|Infinity/.test(svg), `Unsafe or invalid SVG: ${filename}`);
  await writeFile(path.join(directory, filename), svg);
  process.stdout.write(`Rendered assets/readme/${filename}\n`);
}
