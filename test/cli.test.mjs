import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const run = (...args) => spawnSync(process.execPath, ["bin/hop-out.mjs", ...args], { encoding: "utf8" });
test("CLI offline demo returns structured JSON without credentials", () => {
  const result = run("demo", "--format", "json");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).evidence.mode, "demo");
});
test("CLI rejects unknown commands and input flags", () => {
  assert.equal(run("trade").status, 1);
  assert.equal(run("demo", "--wallet", "invalid").status, 1);
  assert.equal(run("inspect", "--token", "invalid", "--amount", "100").status, 1);
});
