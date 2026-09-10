#!/usr/bin/env node
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";

const HELP = `HOP OUT — exit liquidity terminal

  pnpm hop inspect --token <0x...> --amount <tokens>
  pnpm hop inspect --token <0x...> --wallet <public-address>
  pnpm hop demo [--format json|markdown|text]
  pnpm hop doctor

Options:
  --format text|json|markdown   Output format (default: text)
  --output <file>              Save exclusively; never overwrite an existing file
  --help                      Show this help

Run pnpm build:cli once before using the CLI. No web server or wallet needed.
`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    token: { type: "string" }, amount: { type: "string" }, wallet: { type: "string" },
    format: { type: "string", default: "text" }, output: { type: "string" }, help: { type: "boolean" },
  }});
  const command = positionals[0];
  if (values.help || !command) { process.stdout.write(HELP); }
  else {
    if (positionals.length > 1 || !["inspect", "demo", "doctor"].includes(command)) throw new Error("Unknown command. Use --help.");
    if (!["text", "json", "markdown"].includes(values.format)) throw new Error("Use --format text, json, or markdown.");
    if (command !== "inspect" && (values.token || values.wallet || values.amount)) throw new Error("Position flags apply only to inspect.");
    let output;
    if (command === "doctor") {
      const checks = await Promise.all([
        ["Robinhood RPC", "https://rpc.mainnet.chain.robinhood.com"],
        ["Pons API", "https://api.ponsportal.fun/health"],
        ["DexScreener", "https://api.dexscreener.com/latest/dex/tokens/0xac79255f6f404eba14f316e8669d76573a2d7b1e"],
      ].map(async ([name, url]) => {
        const started = Date.now();
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(12_000), ...(name === "Robinhood RPC" ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) } : {}) });
          const data = await response.json();
          const ok = response.ok && (name === "Robinhood RPC" ? parseInt(data.result, 16) === 4663 : name === "Pons API" ? data.ok === true : Array.isArray(data.pairs));
          return { name, ok, latencyMs: Date.now() - started };
        } catch { return { name, ok: false, latencyMs: Date.now() - started }; }
      }));
      output = values.format === "json" ? JSON.stringify({ chainId: 4663, checks }, null, 2) : checks.map((c) => `${c.ok ? "OK" : "FAIL"}  ${c.name} (${c.latencyMs}ms)`).join("\n");
      if (checks.some((check) => !check.ok)) process.exitCode = 2;
    } else {
      const { renderReceipt } = await import("../.hopout-build/receipt.js");
      const report = command === "demo"
        ? (await import("../.hopout-build/demo.js")).demoReport()
        : await (await import("../.hopout-build/quote.js")).buildExitReport({ token: values.token, ...(values.amount !== undefined ? { amount: values.amount } : {}), ...(values.wallet !== undefined ? { wallet: values.wallet } : {}) });
      output = values.format === "json" ? JSON.stringify(report, null, 2) : renderReceipt(report, values.format === "markdown");
    }
    if (values.output) await writeFile(values.output, output + "\n", { flag: "wx" });
    else process.stdout.write(output + "\n");
  }
} catch (error) {
  if (error.code === "ERR_MODULE_NOT_FOUND") process.stderr.write("Run pnpm build:cli before using the CLI.\n");
  else process.stderr.write(`HOP OUT: ${String(error.message).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")}\n`);
  process.exitCode = 1;
}
