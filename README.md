# StellarVault

> Trustless milestone escrow for freelance & remote work, built on Cardano.

[![CI](https://github.com/okokok04/stellarvault/actions/workflows/ci.yml/badge.svg)](https://github.com/okokok04/stellarvault/actions/workflows/ci.yml)
[![Deploy frontend](https://github.com/okokok04/stellarvault/actions/workflows/deploy-frontend.yml/badge.svg)](https://github.com/okokok04/stellarvault/actions/workflows/deploy-frontend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Network](https://img.shields.io/badge/network-Cardano%20Preprod-blue)](docs/SETUP.md)

Cross-border freelance work has a trust problem in both directions: buyers
don't want to pay upfront for undelivered work, and sellers don't want to
deliver work they might never get paid for. **StellarVault** locks each
milestone's payment in a Cardano smart contract that releases funds only
under one of three signature-checked conditions — no platform, and no
StellarVault backend, can move the money any other way.

## Live Preprod deployment

| | |
| --- | --- |
| **Network** | Cardano Preprod |
| **Escrow validator address** | [`addr_test1wzpxqahdn4aqzwuc5x9hc94m0ljqhnc8e9tknca65nm6rdctz5fc9`](https://preprod.cardanoscan.io/address/addr_test1wzpxqahdn4aqzwuc5x9hc94m0ljqhnc8e9tknca65nm6rdctz5fc9) |
| **Bootstrap transaction** | [`eed5c18a...777806`](https://preprod.cardanoscan.io/transaction/eed5c18ad36cf970dcfbd77ded33d5ef8e71d063c37d54fe0ae5efb4ae777806) — proves the address is live |
| **Escrow lock transaction** | [`a3023e7e...113031`](https://preprod.cardanoscan.io/transaction/a3023e7e3730290372a7c5fa76a1e65006cc3de5df5b03aa7a52da81e1113031) — 3 ADA locked with an inline `EscrowDatum` |
| **Escrow release transaction** | [`d59a5468...726a2287`](https://preprod.cardanoscan.io/transaction/d59a54682df089213ee1c77c75126b75476b9def21d7f81272f4ccc2726a2287) — validator executed the `Release` redeemer (`redeemer_count: 1`, `valid_contract: true`) and paid the seller |
| **Dashboard (live demo)** | `<paste the GitHub Pages / hosting URL here>` |
| **Backend API** | `<paste the public backend URL here>` |

The lock → release transactions above are a real, on-chain run of the
full escrow lifecycle (not just a plain payment) — Cardanoscan shows the
validator's redeemer being executed and the milestone amount landing on
the seller's key hash exactly as `contracts/validators/escrow.ak`
specifies. See [`docs/deployment.json`](docs/deployment.json) (generated
by `scripts/deploy-preprod.ts`) for the machine-readable record, and
[`docs/SETUP.md`](docs/SETUP.md) to reproduce this deployment yourself.

## Product

- **X profile**: [x.com/manh71546](https://x.com/manh71546) — see
  [`demo/X_PROFILE.md`](demo/X_PROFILE.md) for bio/pinned post copy.
- **Demo video**: `<link once recorded>` — script in
  [`demo/DEMO_SCRIPT.md`](demo/DEMO_SCRIPT.md).

## How it works

```mermaid
flowchart LR
    UI[React dashboard] -- REST --> API[Express backend]
    API -- Lucid + Blockfrost --> Chain[(Cardano Preprod)]
    Chain -- enforced by --> Validator[Aiken escrow validator]
```

1. **Lock** — buyer, seller, and arbiter addresses plus a milestone
   amount and deadline are locked at the validator's script address.
2. **Release** — buyer signs off on delivery; the seller is paid.
3. **Refund** — if the deadline passes with no release, the buyer signs
   to reclaim the funds.
4. **Resolve** — if buyer and seller can't agree, the named arbiter signs
   to direct funds to either side, so an escrow is never stuck forever.

Full design rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository layout

```
contracts/   Aiken validator: the on-chain, privacy-critical core
backend/     Express API + Lucid off-chain transaction builders
frontend/    Vite + React dashboard (wallet connect, escrow lifecycle UI)
scripts/     Preprod deployment script
docs/        Architecture, setup, and usage documentation
demo/        Demo video script and X profile launch copy
```

## Tech stack

- **Smart contract**: [Aiken](https://aiken-lang.org) → Plutus V3
- **Off-chain**: Node.js, TypeScript, Express, [Lucid Evolution](https://github.com/Anastasia-Labs/lucid-evolution), [Blockfrost](https://blockfrost.io)
- **Frontend**: Vite, React, TypeScript, CIP-30 wallet connect
- **CI/CD**: GitHub Actions (contract check/build, backend + frontend
  lint/test/build, frontend deploy to GitHub Pages)

## Quick start

```sh
git clone https://github.com/okokok04/stellarvault.git
cd stellarvault

cd contracts && aiken check && aiken build && cd ..
cd backend && cp .env.example .env && npm install && npm run dev &
cd frontend && cp .env.example .env && npm install && npm run dev
```

Full walkthrough (funding a Preprod wallet, deploying the contract,
configuring CI/CD): [`docs/SETUP.md`](docs/SETUP.md).
Using the dashboard and the raw REST API: [`docs/USAGE.md`](docs/USAGE.md).

## Testing

```sh
cd contracts && aiken check      # validator unit tests
cd backend    && npm test        # API + store tests (on-chain calls mocked)
cd frontend   && npm test        # component tests
```

All three run in CI on every push/PR — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Roadmap

- Move transaction *building* to the frontend so the connected wallet
  signs directly, removing the backend's custody of a signing key.
- Replace the JSON-file store with Postgres once escrow volume justifies it.
- Support multi-milestone contracts (a single escrow covering several
  sequential payments) instead of one validator instance per milestone.
- Parameterize the validator per-escrow (e.g. by the locking UTxO's output
  reference). Today every escrow shares one script address; the backend
  disambiguates concurrent escrows by `lockTxHash`, which works but is a
  simplification worth replacing as usage grows.

## License

[MIT](LICENSE)
