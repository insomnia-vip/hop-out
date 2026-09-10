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
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps >= 10_000) throw new Error("INVALID_FEES");
  return amount - (amount * BigInt(feeBps)) / 10_000n;
}

export function curveSellQuote(amountIn, tokenReserve, quoteReserve, feeBps, creatorTaxBps = 0) {
  const gross = constantProductOut(amountIn, tokenReserve, quoteReserve);
  // The contract rounds the base fee and creator tax separately, then subtracts both.
  return applyOutputFee(gross, feeBps) + applyOutputFee(gross, creatorTaxBps) - gross;
}

/** Float path for published market depth where only human-unit reserves exist. */
export function marketDepthQuote(amountIn, tokenReserve, quoteReserve, feeBps) {
  if (![amountIn, tokenReserve, quoteReserve, feeBps].every(Number.isFinite)) throw new Error("INVALID_DEPTH");
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
