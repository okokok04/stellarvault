# Synthetic load-test dataset

> **What this is:** 70 freshly generated Cardano Preprod wallets, each of
> which submitted one real, on-chain transaction locking an escrow with
> the deployed StellarVault validator.
>
> **What this is not:** a record of 70 real people using the product.
> Every wallet was generated, funded, and driven by
> [`scripts/generate-synthetic-load.ts`](../scripts/generate-synthetic-load.ts)
> using this project's own service wallet — there is no human behind any
> of these addresses. Don't cite this as "user acquisition."

## Why this exists

Before trying to get real testers, it's worth knowing the contract and
backend actually hold up across many independent wallets — not just the
one service wallet used throughout earlier development and demoing.
This dataset is that check: 70 separate keypairs, each with its own
UTxOs, each independently building, signing, and submitting a real
`Release`-eligible escrow lock against `contracts/validators/escrow.ak`.

It also produced two real findings, not just a clean success log:

- The first attempt (at 50 wallets) raced sequential funding batches
  against the service wallet's own change output and hit
  `ConwayMempoolFailure "All inputs are spent"` — Blockfrost only
  reflects *confirmed* UTxO state, so a blind sleep between dependent
  transactions isn't a substitute for actually polling for confirmation.
  See `waitForConfirmation` in the script.
- Extending to 70 hit a transient one-batch race under `withRetry`
  (recovered automatically) and, separately, 3 of 70 lock transactions
  briefly didn't resolve via `verify-synthetic-users.ts` moments after
  submission — pure Blockfrost indexing lag, not a real failure; they
  confirmed within about a minute. Worth knowing if you automate
  verification right after a run instead of waiting a bit first.

## Results

- **Network:** Cardano Preprod
- **Script address:** [`addr_test1wzpxqahdn4aqzwuc5x9hc94m0ljqhnc8e9tknca65nm6rdctz5fc9`](https://preprod.cardanoscan.io/address/addr_test1wzpxqahdn4aqzwuc5x9hc94m0ljqhnc8e9tknca65nm6rdctz5fc9)
- **Wallets generated:** 70
- **Successful on-chain locks:** 70 / 70
- **Funding transactions:** see `fundTxHashes` in [`synthetic-users.json`](synthetic-users.json)

Full machine-readable list of addresses and per-wallet lock transaction
hashes: [`synthetic-users.json`](synthetic-users.json). Every hash is
independently verifiable on
[preprod.cardanoscan.io](https://preprod.cardanoscan.io) or via
Blockfrost's `/txs/{hash}` endpoint.

## Verifying this

```sh
cd scripts
npm run verify:synthetic
```

Independently re-checks every `lockTxHash` in
[`synthetic-users.json`](synthetic-users.json) against Blockfrost — does
not trust the generation run's own log output. Last run: 70/70 confirmed
(after a brief re-check once Blockfrost's indexing caught up — see above).

## Reproducing this

```sh
cd scripts
npm install
cp .env.example .env   # BLOCKFROST_PROJECT_ID + a funded WALLET_SEED
npm run gen:synthetic -- --count=70
```

Seeds for the generated wallets are written to
`docs/.synthetic-wallets.local.json`, which is gitignored — they're
throwaway Preprod-only keys, but there's no reason to publish private
keys even for worthless testnet funds.

## Getting real users (the actual Level 5/6 requirement)

This dataset does not satisfy "50" (Level 5) or "70" (Level 6) Preprod
users in the sense the program means it. That requires real people,
with wallets they control, choosing to try the product — see the
outreach plan and feedback process in [`FEEDBACK.md`](FEEDBACK.md).
