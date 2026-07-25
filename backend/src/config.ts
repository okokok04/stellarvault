import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  BLOCKFROST_PROJECT_ID: z.string().min(1, "BLOCKFROST_PROJECT_ID is required"),
  NETWORK: z.literal("Preprod").default("Preprod"),
  WALLET_SEED: z.string().min(1, "WALLET_SEED is required"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATA_DIR: z.string().min(1).default("./data"),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid backend configuration. Check your .env against .env.example:\n${issues}`,
    );
  }
  return {
    blockfrostProjectId: parsed.data.BLOCKFROST_PROJECT_ID,
    network: parsed.data.NETWORK,
    walletSeed: parsed.data.WALLET_SEED,
    port: parsed.data.PORT,
    dataDir: parsed.data.DATA_DIR,
  };
}

// Lazily loaded so that unit tests which never touch on-chain code don't
// need real Blockfrost/wallet credentials in the environment.
let cached: ReturnType<typeof loadConfig> | undefined;

export function config(): ReturnType<typeof loadConfig> {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}
