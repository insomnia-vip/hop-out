/**
 * Integer constant-product quote used by the Pons V2 curve path.
 * Fees on a sell are charged from the quote output by the protocol.
 */
export function constantProductOut(amountIn, reserveIn, reserveOut) {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  return (amountIn * reserveOut) / (reserveIn + amountIn);
}

export function applyOutputFee(amount, feeBps) {
  if (amount <= 0n) return 0n;
  const safeFee = BigInt(Math.max(0, Math.min(9_999, Number(feeBps) || 0)));
  return (amount * (10_000n - safeFee)) / 10_000n;
}

export function curveSellQuote(amountIn, tokenReserve, quoteReserve, feeBps) {
  return applyOutputFee(
    constantProductOut(amountIn, tokenReserve, quoteReserve),
    feeBps,
  );
}

/** Float path for published market depth where only human-unit reserves exist. */
export function marketDepthQuote(amountIn, tokenReserve, quoteReserve, feeBps) {
  if (![amountIn, tokenReserve, quoteReserve].every(Number.isFinite)) return 0;
  if (amountIn <= 0 || tokenReserve <= 0 || quoteReserve <= 0) return 0;
  const feeMultiplier = 1 - Math.max(0, Math.min(9_999, feeBps)) / 10_000;
  const netInput = amountIn * feeMultiplier;
  return (netInput * quoteReserve) / (tokenReserve + netInput);
}

export function percentageDifference(reference, actual) {
  if (!Number.isFinite(reference) || !Number.isFinite(actual) || reference <= 0) {
    return null;
  }
  return Math.max(0, (1 - actual / reference) * 100);
}
