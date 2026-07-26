# StellarVault contracts

Aiken source for the on-chain escrow validator described in
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Layout

```
contracts/
  aiken.toml                    project manifest + stdlib dependency
  lib/stellar_vault/
    types.ak                    EscrowDatum / EscrowRedeemer
    utils.ak                    signed_by / paid_at_least / deadline_passed (+ unit tests)
  validators/
    escrow.ak                   the spend validator itself
```

## Commands

```sh
# type-check + run all `test` blocks
aiken check

# compile to Plutus core and emit contracts/plutus.json (the blueprint
# consumed by backend/ and scripts/deploy-preprod.ts)
aiken build

# format
aiken fmt
```

These three commands are exactly what [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
runs on every push and pull request.

`plutus.json` **is committed** despite being a build artifact: it's the
interface contract `backend/` and `scripts/deploy-preprod.ts` read at
runtime, and hosts like Render don't have Aiken installed to regenerate
it. If you change any `.ak` file, re-run `aiken build` and commit the
updated `plutus.json` — CI's "Build" step will fail the PR if you forget,
since it fails on any diff-worthy compile error, but it does *not* check
that the committed blueprint matches the source, so this is on you.

## Design notes

- The datum only stores what the validator needs to authorize a spend
  (three key hashes, one amount, one deadline). Everything else about a
  milestone — description, deliverables, dispute reasoning — is kept
  off-chain, because it's either irrelevant to enforcement or something
  the parties may not want permanently public on an immutable ledger.
- `Resolve` exists so a stuck escrow (buyer and seller disagree, and
  neither `Release` nor `Refund` can be signed by consensus) always has
  a path to finality via the named arbiter, instead of funds being
  locked forever.
