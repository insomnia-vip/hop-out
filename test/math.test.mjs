import assert from "node:assert/strict";
import test from "node:test";
import { applyOutputFee, constantProductOut, curveSellQuote, marketDepthQuote, percentageDifference } from "../lib/hopout/math.mjs";

test("constant-product output stays inside the quote reserve", () => {
  const output = constantProductOut(100n, 1_000n, 500n);
  assert.equal(output, 45n);
  assert.ok(output < 500n);
});

test("output fees only reduce proceeds", () => {
  assert.equal(applyOutputFee(10_000n, 250), 9_750n);
  assert.ok(curveSellQuote(100n, 1_000n, 500n, 250) < constantProductOut(100n, 1_000n, 500n));
});

test("larger market exits receive worse execution per token", () => {
  const small = marketDepthQuote(10, 1_000, 50, 100) / 10;
  const large = marketDepthQuote(500, 1_000, 50, 100) / 500;
  assert.ok(large < small);
});

test("haircut is measured against spot reference", () => {
  assert.equal(percentageDifference(100, 75), 25);
  assert.equal(percentageDifference(0, 0), null);
});
