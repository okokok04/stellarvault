# Setup

## Prerequisites

| Tool           | Version | Install                                                        |
| -------------- | ------- | ---------------------------------------------------------------- |
| Node.js        | ≥ 20    | https://nodejs.org                                              |
| Aiken          | v1.1.9  | https://aiken-lang.org/installation-instructions                |
| Git            | any     | https://git-scm.com                                             |
| A CIP-30 wallet | any    | [Eternl](https://eternl.io) or [Lace](https://lace.io), set to **Preprod** |

You'll also need a free [Blockfrost](https://blockfrost.io) account with a
**Preprod** project (Blockfrost's free tier is enough for this MVP).

## 1. Clone and install

```sh
git clone https://github.com/okokok04/stellarvault.git
cd stellarvault
```

Each of the three subprojects installs independently:

```sh
cd contracts && aiken check                 # type-check + unit tests
cd ../backend && npm install
cd ../frontend && npm install
cd ../scripts && npm install
```

## 2. Build and check the contract

```sh
cd contracts
aiken fmt --check
aiken check          # runs the unit tests in lib/stellar_vault/utils.ak
aiken build           # emits contracts/plutus.json (gitignored build output)
```

`contracts/plutus.json` is required by both `backend/` and
`scripts/deploy-preprod.ts` — nothing after this step works without it.

## 3. Get Preprod test ADA

1. Generate a fresh wallet you'll use **only** for Preprod testing (e.g.
   create a new wallet in Eternl/Lace and switch its network to Preprod).
2. Copy its `addr_test1...` receive address.
3. Request funds from the official faucet:
   https://docs.cardano.org/cardano-testnets/tools/faucet
4. Wait ~1-2 minutes and confirm the balance in your wallet.

If the backend/scripts need their own signing wallet (they do, to submit
transactions as the demo "service" party), export that wallet's 24-word
seed phrase and fund that address too. Never use a mainnet seed anywhere
in this repo.

## 4. Configure and deploy the contract to Preprod

```sh
cd scripts
cp .env.example .env
# edit .env: BLOCKFROST_PROJECT_ID, WALLET_SEED
npm install
npm run deploy:preprod:verify
```

This prints the validator's script address, submits a small real
transaction to it, and writes `docs/deployment.json`. Commit that file —
it's the verifiable proof of a live Preprod deployment this challenge
asks for. Copy the script address and transaction link into the root
[README.md](../README.md#live-preprod-deployment) as well.

## 5. Run the backend

```sh
cd backend
cp .env.example .env
# edit .env: BLOCKFROST_PROJECT_ID, WALLET_SEED, PORT, DATA_DIR
npm install
npm run build
npm run dev          # http://localhost:4000
```

Run the test suite (no network/wallet required — on-chain calls are
mocked):

```sh
npm test
```

## 6. Run the frontend

```sh
cd frontend
cp .env.example .env
# edit .env: VITE_API_BASE_URL (defaults to http://localhost:4000)
npm install
npm run dev           # http://localhost:5173
npm test
```

## 7. Wire up CI/CD

The workflows in `.github/workflows/` need no repo-specific edits to
*run*, but two things make them fully useful:

1. **GitHub Pages**: under `Settings → Pages`, set the source to
   "GitHub Actions" so `deploy-frontend.yml` can publish the dashboard.
2. **Repo variable**: under `Settings → Secrets and variables → Actions →
   Variables`, add `PREPROD_API_BASE_URL` pointing at wherever you host
   the backend (see below), so the deployed dashboard talks to a real
   backend instead of `localhost`.

## 8. Host the backend somewhere public

Any Node-friendly host works (Fly.io, Render, Railway, a small VM). The
only requirements: set the same environment variables as `backend/.env`,
expose port `PORT` over HTTPS, and persist `DATA_DIR` across restarts (a
small volume/disk is enough — it's a JSON file).

## 9. Finish the submission checklist

- [ ] Push this repo to a public GitHub repository.
- [ ] Run `scripts/deploy-preprod.ts --verify` and commit the resulting
      `docs/deployment.json`.
- [ ] Fill in the script address / tx link / live URLs in the root
      README's "Live Preprod deployment" section.
- [ ] Confirm `.github/workflows/ci.yml` has a green run on `main`.
- [ ] Create the product's X (Twitter) profile — see
      [`demo/X_PROFILE.md`](../demo/X_PROFILE.md) — and link it in the README.
- [ ] Record the demo video following
      [`demo/DEMO_SCRIPT.md`](../demo/DEMO_SCRIPT.md).
- [ ] Confirm you have ≥ 15 meaningful commits (`git log --oneline | wc -l`).
