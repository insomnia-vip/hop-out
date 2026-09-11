# Changelog

## 0.6.0 — 2026-09-11

- Added Public Address Mode to Holder Check.
- Holders can now paste any valid EVM address and run the full $HOPOUT receipt without an injected browser wallet.
- Added immediate address validation and a responsive connect-or-paste entry flow.

## 0.5.0 — 2026-09-11

- Added an interactive 5% / 10% / 15% / 20% Exit Limit to Holder Mode.
- Shows the largest tested exit size and estimated proceeds within the selected haircut ceiling.
- Highlights the matching exit row while keeping the result clearly labelled as an estimate.

## 0.4.0 — 2026-09-11

- Added a live 0–100 Door Score to Holder Mode.
- Combined current sellable capacity and full-exit haircut into OPEN, TIGHT, or NARROW exit status.
- Added a compact segmented scanner readout across desktop and mobile.

## 0.3.0 — 2026-09-11

- Added a small visible v0.3 refresh across the landing page, terminal, holder mode, and documentation.
- Published the verified `$HOPOUT` CA throughout the site with direct Pons, Blockscout, and one-click copy actions.
- Activated Holder Mode for the official token and added a current sellable-amount limit for wallets larger than real curve reserves.
- Made holder cost basis and estimated exit P&amp;L use USD when available or the live quote asset (currently ETH) otherwise.
- Updated product positioning across the site and repository to present HOP OUT as a working exit-liquidity tool while preserving its non-custodial safety boundaries.
- Added a dedicated Holder Check route that can request a public EVM wallet address and estimate the official `$HOPOUT` balance at four independent exit sizes.
- Added optional cost-basis input for estimated exit P&L; the app does not infer acquisition cost.
- Added a visibly labelled synthetic holder receipt for previewing the complete flow.

## 0.2.0

- Local CLI: live inspect, offline demo, provider doctor, JSON/Markdown exports.
- Shared calculation engine and provenance in every receipt.
- Curve contract reads pinned to a single block, real-reserve checks, and separate fee rounding.
- Strict canonical pool selection and consistent market price/depth references.
- Input validation and provider timeouts; no silently rounded token amounts.
- Branded README, command reference, contribution guide, test guide and CI matrix.

## 0.1.0

- Browser terminal for Pons V2 tokens on Robinhood Chain.
- Four exit-size estimates, public balance lookup, copyable receipt and local recent checks.
