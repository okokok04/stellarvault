import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/// Independently re-verifies every lock transaction hash in
/// docs/synthetic-users.json against Blockfrost, so the dataset's
/// claims ("50/50 locked successfully") don't have to be taken on
/// faith from the run's own log output.
///
/// Usage: `npm run verify:synthetic`

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = path.resolve(__dirname, "../docs/synthetic-users.json");
const BLOCKFROST_BASE = "https://cardano-preprod.blockfrost.io/api/v0";

interface DatasetWallet {
  address: string;
  lockTxHash: string | null;
  error: string | null;
}

interface Dataset {
  scriptAddress: string;
  totalWallets: number;
  successfulLocks: number;
  wallets: DatasetWallet[];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in scripts/.env`);
  return value;
}

async function txExists(projectId: string, txHash: string): Promise<boolean> {
  const res = await fetch(`${BLOCKFROST_BASE}/txs/${txHash}`, {
    headers: { project_id: projectId },
  });
  return res.ok;
}

async function main() {
  const projectId = requireEnv("BLOCKFROST_PROJECT_ID");
  const dataset: Dataset = JSON.parse(readFileSync(DATASET_PATH, "utf-8"));

  console.log(
    `-> Verifying ${dataset.wallets.length} wallet entries against Blockfrost...`,
  );

  let confirmed = 0;
  let missing = 0;
  for (const [i, wallet] of dataset.wallets.entries()) {
    if (!wallet.lockTxHash) {
      console.log(`   [${i + 1}/${dataset.wallets.length}] skipped (no lock tx recorded)`);
      continue;
    }
    const ok = await txExists(projectId, wallet.lockTxHash);
    if (ok) {
      confirmed++;
    } else {
      missing++;
      console.warn(
        `   [${i + 1}/${dataset.wallets.length}] NOT FOUND on-chain: ${wallet.lockTxHash}`,
      );
    }
  }

  console.log(
    `\n-> ${confirmed}/${dataset.wallets.length} lock transactions independently ` +
      `confirmed on Blockfrost (${missing} missing).`,
  );
  if (confirmed !== dataset.successfulLocks) {
    console.warn(
      `   (!) dataset claims ${dataset.successfulLocks} successful locks, but only ` +
        `${confirmed} verify right now — chain reorg, pruned mempool entry, or a stale file.`,
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
