# Architecture

```text
terminal / WebMCP ----------------------> POST /api/quote
holder page -- public address only ----> POST /api/holder
                    |                            |
                    |                    official $HOPOUT contract
                    |                            |
                    +-------------+--------------+
                                  |
                                  +-- Pons Portal API ---- launch phase, curve, fee metadata, pool id
                                  +-- Robinhood RPC ------ balances and live on-chain curve state
                                  +-- DexScreener API ---- graduated-pool depth and USD references
                                  |
                                  v
                    deterministic quote rows (10 / 25 / 50 / 100%)
```

The terminal never talks to a wallet provider. The separate Holder Check can ask an injected EVM wallet for an account, then passes only that public address to the server. It does not request a signature, approval, transaction, private key, or network switch. Secrets are not required. Browser requests use server routes; the local CLI calls the same engine directly and needs no running website. Both quote paths produce one normalized, timestamped receipt.

The math lives in `lib/hopout/math.mjs`; orchestration and source selection live in `lib/hopout/quote.ts`; response mapping lives in `app/api/quote/route.ts` and `app/api/holder/route.ts`. The holder route uses the verified official contract from `lib/hopout/links.ts`; `HOPOUT_CONTRACT_ADDRESS` remains available as an optional runtime override.

`bin/hop-out.mjs` dispatches CLI commands. `tsconfig.cli.json` compiles the shared engine into ignored `.hopout-build/`. The isolated demo creates a synthetic receipt without importing provider execution. JSON/Markdown exports use exclusive file creation, preserving existing files.

Every live report carries source URLs and a pool identifier or pinned curve block when available. API metadata can still arrive from independently cached services. Invalid input is rejected before provider requests. Public JSON fetches time out after 12 seconds. No API accepts a caller-supplied upstream URL.
