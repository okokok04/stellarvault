import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Blockfrost, Lucid, type SpendingValidator } from "lucid-cardano";

/// Deploys (i.e. derives and verifies) the StellarVault escrow validator
/// on Cardano Preprod. "Deploying" a Plutus validator has no separate
/// upload step — the script address is a pure function of the compiled
/// code, so this script's job is to:
///
///   1. load contracts/plutus.json (produced by `aiken build`)
///   2. compute the validator's script address on Preprod
///   3. optionally (--verify) submit a small real transaction to that
///      address, proving it is a live, spendable Preprod contract
///   4. write the result to docs/deployment.json for the README
///
/// Run from scripts/: `npm install && npm run deploy:preprod:verify`

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINT_PATH = path.resolve(__dirname, "../contracts/plutus.json");
const VALIDATOR_TITLE = "escrow.escrow.spend";
const DEPLOYMENT_OUTPUT = path.resolve(__dirname, "../docs/deployment.json");
const MIN_RECOMMENDED_BALANCE = 5_000_000n;
const BOOTSTRAP_LOVELACE = 2_000_000n;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy scripts/.env.example to scripts/.env and fill it in.`,
    );
  }
  return value;
}

function loadValidator(): SpendingValidator {
  let blueprint: { validators: { title: string; compiledCode: string }[] };
  try {
    blueprint = JSON.parse(readFileSync(BLUEPRINT_PATH, "utf-8"));
  } catch {
    throw new Error(
      `Could not read ${BLUEPRINT_PATH}. Run "aiken build" inside contracts/ first.`,
    );
  }
  const compiled = blueprint.validators.find(
    (v) => v.title === VALIDATOR_TITLE,
  );
  if (!compiled) {
    throw new Error(`Validator "${VALIDATOR_TITLE}" missing from plutus.json`);
  }
  return { type: "PlutusV3", script: compiled.compiledCode };
}

async function main() {
  const projectId = requireEnv("BLOCKFROST_PROJECT_ID");
  const seed = requireEnv("WALLET_SEED");
  const verify = process.argv.includes("--verify");

  console.log("-> Connecting to Blockfrost (Cardano Preprod)...");
  const lucid = await Lucid.new(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", projectId),
    "Preprod",
  );
  lucid.selectWalletFromSeed(seed);

  const walletAddress = await lucid.wallet.address();
  const utxos = await lucid.wallet.getUtxos();
  const balanceLovelace = utxos.reduce(
    (sum, utxo) => sum + (utxo.assets.lovelace ?? 0n),
    0n,
  );

  console.log(`   wallet address : ${walletAddress}`);
  console.log(`   balance        : ${balanceLovelace} lovelace`);

  if (balanceLovelace < MIN_RECOMMENDED_BALANCE) {
    console.warn(
      "   (!) balance looks low. Fund this address from the Preprod " +
        "faucet: https://docs.cardano.org/cardano-testnets/tools/faucet",
    );
  }

  const validator = loadValidator();
  const scriptAddress = lucid.utils.validatorToAddress(validator);
  console.log(`\n-> Escrow validator script address:\n   ${scriptAddress}`);

  let bootstrapTxHash: string | null = null;

  if (verify) {
    console.log(
      `\n-> Submitting a ${BOOTSTRAP_LOVELACE} lovelace bootstrap payment ` +
        "to prove the address is live...",
    );
    const tx = await lucid
      .newTx()
      .payToAddress(scriptAddress, { lovelace: BOOTSTRAP_LOVELACE })
      .complete();
    const signed = await tx.sign().complete();
    bootstrapTxHash = await signed.submit();
    console.log(`   tx submitted: ${bootstrapTxHash}`);
    console.log(
      `   track it at: https://preprod.cardanoscan.io/transaction/${bootstrapTxHash}`,
    );
  } else {
    console.log(
      "\n   (dry run — pass --verify to submit a real bootstrap transaction)",
    );
  }

  const record = {
    network: "Preprod",
    scriptAddress,
    walletAddress,
    validatorTitle: VALIDATOR_TITLE,
    bootstrapTxHash,
    deployedAt: new Date().toISOString(),
  };

  writeFileSync(DEPLOYMENT_OUTPUT, JSON.stringify(record, null, 2));
  console.log(`\n-> Wrote deployment record to ${DEPLOYMENT_OUTPUT}`);
  console.log(
    '   Copy scriptAddress into README.md\'s "Live Preprod deployment" section.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
