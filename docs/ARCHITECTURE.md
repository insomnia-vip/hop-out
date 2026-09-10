# Architecture

```text
browser / WebMCP
       |
       v
POST /api/quote
       |
       +-- Pons Portal API ---- launch phase, curve, fee metadata, pool id
       +-- Robinhood RPC ------ balances and live on-chain curve state
       +-- DexScreener API ---- graduated-pool depth and USD references
       |
       v
deterministic quote rows (10 / 25 / 50 / 100%)
```

The browser never talks to a wallet provider. Secrets are not required. All external calls are made by the server route, which returns one normalized, timestamped receipt.

The math lives in `lib/hopout/math.mjs`; orchestration and source selection live in `lib/hopout/quote.ts`; response mapping lives in `app/api/quote/route.ts`.
