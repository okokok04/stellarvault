import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Blockfrost,
  Data,
  Lucid,
  generateSeedPhrase,
  paymentCredentialOf,
  validatorToAddress,
  walletFromSeed,
  type Provider,
  type SpendingValidator,
} from "@lucid-evolution/lucid";

/// Generates N fresh Preprod wallets, funds each from this project's own
/// service wallet, and has each one lock a small (real, on-chain) escrow
/// against the deployed StellarVault validator.
///
/// This is a SYNTHETIC LOAD-TEST dataset, not a record of real users. It
/// exists to exercise the validator across many independent wallets and
/// to produce a reproducible "N distinct wallets interacted with the
/// contract" artifact — see docs/synthetic-users.md for exactly what
/// this is (and isn't) before citing it anywhere.
///
/// Usage: `npm run gen:synthetic -- --count=50`

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINT_PATH = path.resolve(__dirname, "../contracts/plutus.json");
const VALIDATOR_TITLE = "escrow.escrow.spend";
const NETWORK = "Preprod" as const;
const FUND_LOVELACE = 3_000_000n;
const LOCK_LOVELACE = 1_000_000n;
// Large enough that a 50-wallet run fits in a single funding tx — avoids
// racing sequential batches against the same service-wallet UTxO (see
// waitForConfirmation: Blockfrost only reflects *confirmed* state, so a
// blind sleep between batches isn't a reliable substitute for this).
const FUND_BATCH_SIZE = 60;
const CONCURRENCY = 5;
const BLOCKFROST_BASE = "https://cardano-preprod.blockfrost.io/api/v0";

const WALLETS_OUTPUT = path.resolve(__dirname, "../docs/.synthetic-wallets.local.json");
const RESULTS_OUTPUT = path.resolve(__dirname, "../docs/synthetic-users.json");

const DatumSchema = Data.Object({
  buyer: Data.Bytes(),
  seller: Data.Bytes(),
  arbiter: Data.Bytes(),
  milestone_amount: Data.Integer(),
  deadline: Data.Integer(),
});
type OnChainDatum = Data.Static<typeof DatumSchema>;
const OnChainDatum = DatumSchema as unknown as OnChainDatum;

function loadValidator(): SpendingValidator {
  const blueprint = JSON.parse(readFileSync(BLUEPRINT_PATH, "utf-8")) as {
    validators: { title: string; compiledCode: string }[];
  };
  const compiled = blueprint.validators.find((v) => v.title === VALIDATOR_TITLE);
  if (!compiled) {
    throw new Error(`Validator "${VALIDATOR_TITLE}" missing from plutus.json`);
  }
  return { type: "PlutusV3", script: compiled.compiledCode };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in scripts/.env`);
  return value;
}

function parseCount(): number {
  const arg = process.argv.find((a) => a.startsWith("--count="));
  return arg ? Number(arg.split("=")[1]) : 50;
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = 3000 * (i + 1);
      console.warn(
        `   (!) ${label} failed (attempt ${i + 1}/${attempts}): ` +
          `${(err as Error).message?.slice(0, 120)} — retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/// Blindly sleeping between dependent transactions isn't reliable —
/// Cardano block times vary, and Blockfrost only reflects *confirmed*
/// UTxO state, so a too-short sleep lets the next tx's coin selection
/// see stale (already-spent) inputs. Poll for real confirmation instead.
async function waitForConfirmation(
  projectId: string,
  txHash: string,
  timeoutMs = 180_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BLOCKFROST_BASE}/txs/${txHash}`, {
      headers: { project_id: projectId },
    });
    if (res.ok) return;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timed out waiting for ${txHash} to confirm`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const count = parseCount();
  const projectId = requireEnv("BLOCKFROST_PROJECT_ID");
  const serviceSeed = requireEnv("WALLET_SEED");
  const provider: Provider = new Blockfrost(
    "https://cardano-preprod.blockfrost.io/api/v0",
    projectId,
  );
  const validator = loadValidator();
  const scriptAddress = validatorToAddress(NETWORK, validator);

  console.log(`-> Generating ${count} fresh Preprod wallets...`);
  const wallets = Array.from({ length: count }, () => {
    const seed = generateSeedPhrase();
    const { address } = walletFromSeed(seed, { network: NETWORK });
    return { seed, address };
  });
  writeFileSync(WALLETS_OUTPUT, JSON.stringify(wallets, null, 2));
  console.log(`   wrote seeds (local only, gitignored) to ${WALLETS_OUTPUT}`);

  console.log("-> Connecting service wallet...");
  const serviceLucid = await Lucid(provider, NETWORK);
  serviceLucid.selectWallet.fromSeed(serviceSeed);

  console.log(
    `-> Funding ${count} wallets with ${FUND_LOVELACE} lovelace each ` +
      `(batches of ${FUND_BATCH_SIZE})...`,
  );
  const fundTxHashes: string[] = [];
  for (let i = 0; i < wallets.length; i += FUND_BATCH_SIZE) {
    const batch = wallets.slice(i, i + FUND_BATCH_SIZE);
    const batchNumber = i / FUND_BATCH_SIZE + 1;
    const txHash = await withRetry(`fund batch ${batchNumber}`, async () => {
      let txBuilder = serviceLucid.newTx();
      for (const w of batch) {
        txBuilder = txBuilder.pay.ToAddress(w.address, { lovelace: FUND_LOVELACE });
      }
      const tx = await txBuilder.complete();
      const signed = await tx.sign.withWallet().complete();
      return signed.submit();
    });
    fundTxHashes.push(txHash);
    console.log(`   batch ${batchNumber}: ${txHash} (waiting for confirmation...)`);
    // Wait for real confirmation, not a blind sleep — the next batch's
    // coin selection needs this batch's change output to actually exist
    // in Blockfrost's confirmed UTxO view before it can be spent.
    await waitForConfirmation(projectId, txHash);
    console.log(`   batch ${batchNumber}: confirmed`);
  }

  console.log("-> Confirming funding is spendable before locking escrows...");
  await waitForConfirmation(projectId, fundTxHashes[fundTxHashes.length - 1]);

  console.log(
    `-> Each wallet locks ${LOCK_LOVELACE} lovelace into the escrow validator ` +
      `(concurrency ${CONCURRENCY})...`,
  );
  const results = await mapWithConcurrency(wallets, CONCURRENCY, async (wallet, i) => {
    try {
      const lucid = await Lucid(provider, NETWORK);
      lucid.selectWallet.fromSeed(wallet.seed);
      const hash = paymentCredentialOf(wallet.address).hash;

      const datum: OnChainDatum = {
        buyer: hash,
        seller: hash,
        arbiter: hash,
        milestone_amount: LOCK_LOVELACE,
        deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
      };

      const lockTxHash = await withRetry(`lock #${i + 1}`, async () => {
        const tx = await lucid
          .newTx()
          .pay.ToContract(
            scriptAddress,
            { kind: "inline", value: Data.to<OnChainDatum>(datum, OnChainDatum) },
            { lovelace: LOCK_LOVELACE },
          )
          .complete();
        const signed = await tx.sign.withWallet().complete();
        return signed.submit();
      });

      console.log(
        `   [${i + 1}/${wallets.length}] ${wallet.address.slice(0, 20)}... -> ${lockTxHash}`,
      );
      return { address: wallet.address, lockTxHash, error: null as string | null };
    } catch (err) {
      console.warn(
        `   [${i + 1}/${wallets.length}] FAILED: ${(err as Error).message?.slice(0, 200)}`,
      );
      return {
        address: wallet.address,
        lockTxHash: null as string | null,
        error: (err as Error).message,
      };
    }
  });

  const succeeded = results.filter((r) => r.lockTxHash);
  writeFileSync(
    RESULTS_OUTPUT,
    JSON.stringify(
      {
        disclaimer:
          "SYNTHETIC LOAD-TEST DATASET — not real distinct users. Every " +
          "wallet here was generated, funded, and driven by " +
          "scripts/generate-synthetic-load.ts using this project's own " +
          "service wallet. See docs/synthetic-users.md.",
        network: "Preprod",
        scriptAddress,
        generatedAt: new Date().toISOString(),
        totalWallets: wallets.length,
        successfulLocks: succeeded.length,
        fundTxHashes,
        wallets: results,
      },
      null,
      2,
    ),
  );

  console.log(
    `\n-> Done: ${succeeded.length}/${wallets.length} wallets locked an escrow successfully.`,
  );
  console.log(`   Results written to ${RESULTS_OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
