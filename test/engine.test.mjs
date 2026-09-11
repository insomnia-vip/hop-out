import test from "node:test";
import assert from "node:assert/strict";
import { buildExitReport } from "../.hopout-build/quote.js";
import { validateInput } from "../.hopout-build/input.js";
import { curveSellQuote } from "../lib/hopout/math.mjs";
import { demoReport } from "../.hopout-build/demo.js";
import { renderReceipt } from "../.hopout-build/receipt.js";
import { getHopOutContract } from "../.hopout-build/project-token.js";

const token = "0x0000000000000000000000000000000000000001";
const quote = "0x0000000000000000000000000000000000000000";
function fixture(phase = 2, pairId = "pool") {
  const reads = [];
  return { reads, dependencies: {
    async json(url) {
      if (url.includes("dexscreener")) return { pairs: [{ chainId: "robinhood", pairAddress: pairId, baseToken: { address: token }, quoteToken: { address: quote, symbol: "ETH" }, priceNative: "0.001", priceUsd: "2", liquidity: { base: 10000, quote: 10, usd: 40000 }, url: "https://dexscreener.com/robinhood/pool" }] };
      if (url.endsWith("/price")) return { ok: true, poolId: "pool", priceInPair: 0.009, lpFeeBps: 50 };
      return { ok: true, token, name: "Fixture", symbol: "TEST", decimals: 18, totalSupply: "1000000000000000000000000", curve: token, pairToken: quote, pairTokenLabel: "ETH", creatorTaxBps: 100, phase, phaseLabel: phase === 0 ? "Curve" : "PoolCreated", blockscoutUrl: "https://robinhoodchain.blockscout.com/token/" + token };
    },
    reader: { async getBlockNumber() { return 123n; }, async readContract(input) {
      reads.push(input);
      const unit = 10n ** 18n;
      return { getReserves: [10n * unit, 10000n * unit], feeBps: 100n, creatorTaxBps: 100n, realQuoteReserve: 5n * unit, readyToGraduate: false, balanceOf: 100n * unit }[input.functionName];
    } },
  } };
}

test("rejects malformed and ambiguous inputs before requests", () => {
  for (const input of [null, { token: 12 }, { token, amount: "1", wallet: token }, { token, amount: "1e6" }, { token, amount: "0" }]) assert.throws(() => validateInput(input));
});
test("canonical pool cannot silently fall back to an unrelated market", async () => {
  await assert.rejects(buildExitReport({ token, amount: "100" }, fixture(2, "other-pool").dependencies), /NO_MARKET/);
});
test("graduated quotes use one market's price and depth", async () => {
  const f = fixture();
  const result = await buildExitReport({ token, amount: "100" }, f.dependencies);
  assert.equal(result.market.priceInPair, 0.001);
  assert.equal(result.evidence.poolId, "pool");
  assert.equal(result.quotes.length, 4);
  assert.ok(result.quotes.every((row) => Number.isFinite(row.proceedsQuote)));
  assert.equal(f.reads.length, 0);
});
test("curve reads pin all contract values to the same block", async () => {
  const f = fixture(0);
  const result = await buildExitReport({ token, wallet: token }, f.dependencies);
  assert.equal(result.evidence.blockNumber, "123");
  assert.ok(f.reads.every((read) => read.blockNumber === 123n));
  assert.equal(result.market.priceInPair, 0.001);
});
test("curve rejects a hypothetical position with insufficient real reserves", async () => {
  await assert.rejects(buildExitReport({ token, amount: "100000" }, fixture(0).dependencies), /INSUFFICIENT_RESERVES/);
});
test("amount precision is not silently rounded", async () => {
  await assert.rejects(buildExitReport({ token, amount: "0.1234567890123456789" }, fixture().dependencies), /INVALID_AMOUNT/);
});
test("separate fee rounding follows Pons quote-output subtraction", () => {
  assert.equal(curveSellQuote(1n, 1n, 202n, 100, 100), 99n);
});
test("offline demo is visibly synthetic and its export keeps provenance", () => {
  const result = demoReport();
  assert.equal(result.evidence.mode, "demo");
  assert.deepEqual(result.evidence.sources, []);
  assert.match(renderReceipt(result, true), /DEMO/);
  assert.match(renderReceipt(result), /synthetic offline fixture/);
});

test("holder mode activates only with a valid configured contract", () => {
  assert.equal(getHopOutContract({}), null);
  assert.equal(getHopOutContract({ HOPOUT_CONTRACT_ADDRESS: "pending" }), null);
  assert.equal(getHopOutContract({ HOPOUT_CONTRACT_ADDRESS: `  ${token}  ` }), token);
});
