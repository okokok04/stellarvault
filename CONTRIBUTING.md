# Contributing

## Project layout

See the "Repository layout" section of [README.md](README.md) — each of
`contracts/`, `backend/`, `frontend/`, and `scripts/` is an independently
installable subproject.

## Before opening a PR

```sh
cd contracts && aiken fmt --check && aiken check && aiken build
cd backend    && npm run lint && npm run build && npm test
cd frontend   && npm run lint && npm test && npm run build
```

These are exactly the checks `.github/workflows/ci.yml` runs — a PR
should not go green in CI for the first time; it should already be green
locally.

## Commit style

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `test(scope): ...`,
`chore: ...`, `ci: ...`. Scope is usually `contracts`, `backend`, or
`frontend`.

## Changing the validator

Any change to `contracts/validators/escrow.ak` or
`contracts/lib/stellar_vault/*.ak` changes the compiled Plutus code, which
changes the script address. After such a change:

1. Re-run `aiken build` to regenerate `contracts/plutus.json`.
2. Re-run `scripts/deploy-preprod.ts --verify` to derive and verify the
   new address — existing escrows locked at the old address are
   unaffected but the two addresses are not interchangeable.
3. Update the "Live Preprod deployment" section of the README and commit
   the refreshed `docs/deployment.json`.

## Reporting issues

Use the bug report / feature request templates under
`.github/ISSUE_TEMPLATE/`.
