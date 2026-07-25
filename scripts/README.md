# Deployment scripts

## `deploy-preprod.ts`

Derives the escrow validator's script address on Cardano **Preprod** and,
with `--verify`, submits a small real transaction to it so the address is
provably live.

```sh
cd scripts
npm install
cp .env.example .env      # fill in BLOCKFROST_PROJECT_ID and WALLET_SEED
npm run deploy:preprod            # dry run: prints the script address
npm run deploy:preprod:verify     # submits a 2 ADA bootstrap tx
```

Requires:
- `contracts/plutus.json` to exist (`aiken build` from `contracts/`).
- A free [Blockfrost](https://blockfrost.io) Preprod project ID.
- A Preprod-only wallet funded via the [testnet faucet](https://docs.cardano.org/cardano-testnets/tools/faucet).

The result (script address, wallet address, bootstrap tx hash) is written
to `docs/deployment.json` and should be copied into the root `README.md`.
