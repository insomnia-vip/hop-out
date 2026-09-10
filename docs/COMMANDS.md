# Commands

Requires Node 22.13+ and pnpm 11.19.0. Run `pnpm install --frozen-lockfile` and `pnpm build:cli` after cloning.

| Command | Result | Network |
| --- | --- | --- |
| `pnpm hop demo` | Synthetic, reproducible receipt | None |
| `pnpm hop inspect --token ADDRESS --amount 1000000` | Live position estimate | Public providers |
| `pnpm hop inspect --token ADDRESS --wallet ADDRESS` | Reads public token balance and estimates exit | Public providers + RPC |
| `pnpm hop doctor` | Checks Pons, DexScreener and RPC chain 4663 | Public providers |
| `pnpm dev` | Browser terminal on localhost:5173 | On live inspection only |
| `pnpm check` | Types, lint, deterministic tests and site build | None after install |

## Export a receipt

```bash
pnpm hop inspect --token 0xac79255f6f404eba14f316e8669d76573a2d7b1e --amount 1000000 --format json --output copy-receipt.json
pnpm hop demo --format markdown --output demo-receipt.md
```

An output path must not already exist. Exports contain public addresses, market data and observation times. No credentials are written. Terminal text strips control characters from externally supplied names.

## Input rules

Pass exactly one of `--amount` or `--wallet` to `inspect`. Amounts are decimal strings: `1000000` or `12.5`, not `1e6`. Extra decimal places are rejected, never silently rounded. The CLI uses the same engine as `POST /api/quote`; a hosted website is not required.

## Exit codes

- `0`: completed.
- `1`: invalid input, quote unavailable, or local export failure.
- `2`: at least one `doctor` provider check failed.

## Troubleshooting

- **Run pnpm build:cli:** compile the shared engine before the first terminal command.
- **No canonical depth:** the Pons pool is not indexed or has missing reserves; HOP OUT does not substitute an unrelated pool.
- **Insufficient real reserves:** a hypothetical position cannot be covered by the curve's physical trading reserve.
- **Pons unavailable:** public providers have limits. Avoid repeatedly submitting the same request; retry later.
- **GitHub push login:** the browser account and local Git login are separate. Use Git Credential Manager for `insomnia-vip`, then `git push -u origin main`.
