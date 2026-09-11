# Verification

`pnpm check` checks types, lint, deterministic tests and the production website bundle. CI runs the same command on Node 22 and 24.

The fixture suite covers malformed and ambiguous input, excessive decimals, canonical pool selection, consistent price/depth sources, block-pinned curve reads, insufficient physical reserves, holder sellable-amount caps, fee rounding, CLI command errors, and official-contract validation. Fixtures do not hit public providers. The demo is synthetic and has an empty source list.

Live verification is separate:

```bash
pnpm doctor
pnpm hop inspect --token 0xac79255f6f404eba14f316e8669d76573a2d7b1e --amount 1000000
```

Provider status and token values can change. A passing fixture suite verifies the implementation; it does not prove a market quote can execute. WebMCP support is progressive enhancement. Registration has been observed in the browser; invocation behavior has not been separately verified through a supported agent context.
