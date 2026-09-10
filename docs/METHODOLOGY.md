# Methodology

HOP OUT answers one narrow question: if a position were sold against the currently visible market, how different might the proceeds be from its last-price value?

Every report includes an observation timestamp, source phase, calculation label, and caveat. It never represents an estimate as an executable quote.

## Inputs

- A Pons V2 token contract on Robinhood Chain (`chainId 4663`).
- Either a decimal token amount or a public wallet address.
- For a wallet input, the application reads `balanceOf(wallet)` from the token contract.

## Spot value

For a fraction `f` of a position:

```text
tokens = position × f
spot value = tokens × current displayed price
```

This is a reference number, not expected proceeds.

## Phase 0: Pons V2 curve

The application reads live `quoteReserve`, `tokenReserve`, and `feeBps` from the Pons V2 curve. For token input `x`:

```text
gross quote out = x × quoteReserve / (tokenReserve + x)
base fee = floor(gross quote out × baseFeeBps / 10,000)
creator tax = floor(gross quote out × creatorTaxBps / 10,000)
net quote out = gross quote out - base fee - creator tax
```

The curve sell fee and creator tax are read on-chain and rounded separately, matching Pons' `sell` implementation. All contract reads use one recorded block. The engine also reads `realQuoteReserve()` and `readyToGraduate()`: it rejects a position whose gross output exceeds real trading reserves and refuses a curve already ready to graduate. Pricing reserves may include virtual liquidity. HOP OUT labels this path `protocol-math`; it still does not simulate transaction execution or gas.

## Phase 2: graduated market

The application uses the pool identifier reported by Pons to select the canonical Robinhood Chain market returned by DexScreener. DexScreener publishes base and quote depth in human units, so the application estimates:

```text
net token in = x × (10,000 - modeledFeeBps) / 10,000
estimated quote out = net token in × quoteDepth / (tokenDepth + net token in)
```

The modeled fee uses an explicit **1% platform assumption**, plus the reported creator and LP fees; it is not a live reconstruction of all hook behavior. These are approximated as an input-side discount for the constant-product calculation. The estimate does not reconstruct Uniswap v4 ticks or competing routes. It is labeled `market-depth-estimate` throughout the interface. Spot and quote-to-USD conversion use the selected DexScreener pair to avoid mixing differently timed price sources. If the canonical pool is missing, the engine refuses instead of choosing a different pool.

## Haircut

```text
haircut % = max(0, 1 - estimated proceeds / spot value) × 100
```

The interface computes this independently for 10%, 25%, 50%, and 100% of the input position.

## Data sources

- Pons Portal public token and price API for launch identity, phase, creator tax, curve address, and canonical pool.
- Robinhood Chain JSON-RPC for balances, curve reserves, token decimals, and curve fee.
- DexScreener token endpoint for published graduated-pool depth and USD reference values.

## Known limitations

- State may move between observation and execution.
- A transaction can have gas cost, taxes, reverts, routing behavior, or MEV not represented here.
- Aggregate pool depth is an approximation for concentrated-liquidity execution.
- An upstream API may be stale or unavailable.
- Extreme values are formatted for readability, but calculations preserve raw integers on the curve path.
- Published market data has an observation timestamp, not a pinned on-chain block. The upstream cache age is unknown.
- Curve-only launches without a usable USD reference show native quote units; missing USD is never fabricated.

## Protocol references

- [Pons curve source](https://github.com/ponsdotdev/ponsfamily/blob/main/contractsV2/src/v2/PonsV2BondingCurve.sol): `sell`, `getReserves`, `realQuoteReserve`, `readyToGraduate`.
- [Pons math library](https://github.com/ponsdotdev/ponsfamily/blob/main/contractsV2/src/v2/libraries/PonsV2BondingCurveMath.sol): `getAmountOut`.
- [Pons public API](https://www.ponsportal.fun/docs.html) and [DexScreener reference](https://docs.dexscreener.com/api/reference).

HOP OUT should be used as a risk screen and research aid, never as a promise of proceeds.
