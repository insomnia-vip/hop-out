<div align="center">
  <img src="public/hop-out-toad.png" width="148" alt="HOP OUT pixel frog" />
  <h1>HOP OUT</h1>
  <p><strong>Your bag grew. The exit didn't.</strong></p>
  <p>A read-only exit-liquidity terminal for Pons V2 tokens on Robinhood Chain.</p>
</div>

---

The portfolio number is mark-to-market. It assumes every token can leave at the last traded price. Thin pools do not work that way.

HOP OUT measures the door. Give it a Pons V2 token and either an amount or a public wallet. It compares the screen value with estimated proceeds for selling 10%, 25%, 50%, and 100% of the position.

> Big bag. Small door.

## What it does

- reads a token amount or an address's public ERC-20 balance;
- identifies the live Pons V2 launch phase;
- uses live bonding-curve reserves before graduation;
- uses the canonical pool's published depth after graduation;
- models protocol, creator, and pool fees;
- returns spot value, estimated proceeds, haircut, liquidity, and a plain-English verdict;
- never connects a wallet, requests a signature, or constructs a transaction.

## Try it

Use the COPY contract as a live example:

```text
0xac79255f6f404eba14f316e8669d76573a2d7b1e
```

The interface also exposes the read-only `inspect_exit_liquidity` WebMCP tool in supported browsers, so an agent can run the same visible workflow with structured input and output.

## How the estimate works

### Phase 0 — live bonding curve

HOP OUT reads `getReserves()` and the frozen `feeBps()` directly from the launch's Pons V2 curve. The gross sell output follows the protocol's constant-product formula, then launch and creator fees are removed from quote output. This path is labeled **protocol math**.

### Phase 2 — graduated pool

HOP OUT selects the canonical pool reported by Pons and reads its published base/quote depth from DexScreener. It applies a constant-product depth estimate and modeled fees. This path is deliberately labeled **market-depth estimate** because concentrated-liquidity routing can differ from aggregate published reserves.

Full assumptions and formulas live in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Run locally

Requires Node.js 22.13+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:5173`.

```bash
pnpm test
pnpm build
```

## API

`POST /api/quote`

```json
{
  "token": "0xac79255f6f404eba14f316e8669d76573a2d7b1e",
  "amount": "1000000"
}
```

Use `wallet` instead of `amount` to inspect that address's complete public balance.

## Boundaries

HOP OUT is an estimator, not a router or executable quote. Blockchain state can change before a trade lands. The project is independent, unaffiliated with Robinhood or Pons, and is not financial advice.

See [SECURITY.md](SECURITY.md) before reporting an issue.

## License

MIT
