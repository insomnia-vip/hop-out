# Security policy

HOP OUT is intentionally read-only. The Holder Check may request an account from an injected EVM wallet, then uses only that public address. It does not request private keys, seed phrases, signatures, approvals, network changes, or transactions.

## Report a vulnerability

Please open a GitHub security advisory rather than a public issue when a report could expose users or infrastructure. Include reproduction steps, affected commit, and impact. Do not include private keys or real seed phrases in any report.

## Scope

Useful reports include input-validation bypasses, dependency compromise, server-side request abuse, misleading quote computation, or a change that introduces custody/signing behavior.

Market movements, upstream data differences, and expected estimation error documented in `docs/METHODOLOGY.md` are not security vulnerabilities.
