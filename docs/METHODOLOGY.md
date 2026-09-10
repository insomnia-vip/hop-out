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
net quote out = gross quote out × (10,000 - totalFeeBps) / 10,000
```

`totalFeeBps` combines the curve sell fee and creator tax reported for the launch. Integer division follows on-chain arithmetic. HOP OUT labels this path `protocol-math`.

## Phase 2: graduated market

The application uses the pool identifier reported by Pons to select the canonical Robinhood Chain market returned by DexScreener. DexScreener publishes base and quote depth in human units, so the application estimates:

```text
net token in = x × (10,000 - modeledFeeBps) / 10,000
estimated quote out = net token in × quoteDepth / (tokenDepth + net token in)
```

The modeled fee includes the platform, creator, and reported pool fee. The estimate does not reconstruct Uniswap v4 ticks or competing routes. It is labeled `market-depth-estimate` throughout the interface.

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

HOP OUT should be used as a risk screen and research aid, never as a promise of proceeds.
