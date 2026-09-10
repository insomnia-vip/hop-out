# README terminal illustrations

These are styled documentation views of HOP OUT's real outputs, not screenshots of an additional TUI, watchlist or live dashboard. They use the project's own SVG layout and pixel wordmark; no artwork or source code is copied from the reference repositories.

| Image | Data |
| --- | --- |
| `live-receipt.svg` | Public COPY inspection, timestamped in `live-snapshot.json` |
| `exit-ladder.svg` | Deterministic synthetic `demoReport()` |
| `doctor.svg` | Actual provider responses and measured latency in `doctor-snapshot.json` |
| `json-export.svg` | Subset of the synthetic JSON export, including the 100% sale row |

Captured data is historical, not a current price or uptime guarantee. COPY is an example token, not a HOP OUT contract. DEMO pictures never represent a deployed asset. Image titles, descriptions and nearby README captions preserve these distinctions.

## Reproduce

After installing dependencies:

```bash
pnpm build:cli
node scripts/render-readme.mjs
```

This regenerates all four SVGs from the committed snapshots and the offline demo. No network request is made.

To intentionally refresh the two public-data captures and all illustrations:

```bash
node scripts/render-readme.mjs --refresh
```

This runs the existing `inspect` and `doctor` commands. It updates only the files in `assets/readme/`. No key, wallet connection, trade or secret is required. Review the resulting images and timestamps before committing them.
