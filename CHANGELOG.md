# Changelog

## Unreleased

- Added a dedicated Holder Check route that can request a public EVM wallet address and estimate the official `$HOPOUT` balance at four independent exit sizes.
- Added optional cost-basis input for estimated exit P&L; the app does not infer acquisition cost.
- Kept the holder route in a safe pre-launch state until a valid `HOPOUT_CONTRACT_ADDRESS` is configured.
- Added a visibly labelled synthetic holder receipt for previewing the complete flow before CA publication.

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
