# Contributing

1. Fork and clone the repository, then install the frozen pnpm lockfile.
2. Reproduce the behavior using `pnpm demo` or a narrowly scoped provider fixture.
3. Keep the calculation shared between the web API and the CLI.
4. Run `pnpm check` and document any change to formulas or evidence labels.
5. Open a pull request describing the user-visible result and how it was checked.

Missing values must remain unknown. Do not silently choose a different pool, replace live failures with demo values, or add wallet signing to the read-only path. Never include credentials in fixtures or issues.
