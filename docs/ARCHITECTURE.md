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

The browser never talks to a wallet provider. Secrets are not required. Browser requests use the server route; the local CLI calls the same engine directly and needs no running website. Both produce one normalized, timestamped receipt.

The math lives in `lib/hopout/math.mjs`; orchestration and source selection live in `lib/hopout/quote.ts`; response mapping lives in `app/api/quote/route.ts`.

`bin/hop-out.mjs` dispatches CLI commands. `tsconfig.cli.json` compiles the shared engine into ignored `.hopout-build/`. The isolated demo creates a synthetic receipt without importing provider execution. JSON/Markdown exports use exclusive file creation, preserving existing files.

Every live report carries source URLs and a pool identifier or pinned curve block when available. API metadata can still arrive from independently cached services. Invalid input is rejected before provider requests. Public JSON fetches time out after 12 seconds. No API accepts a caller-supplied upstream URL.
