import { createApp } from "./app.js";
import { config } from "./config.js";
import { createFeedbackFileStore } from "./lib/feedbackStore.js";
import * as onchain from "./lib/onchain.js";
import { createFileStore } from "./lib/store.js";

const cfg = config();
const app = createApp({
  store: createFileStore(cfg.dataDir),
  onchain,
  feedbackStore: createFeedbackFileStore(cfg.dataDir),
});

app.listen(cfg.port, () => {
  console.log(`StellarVault backend listening on port ${cfg.port}`);
  console.log(`Network: ${cfg.network} | Data dir: ${cfg.dataDir}`);
});
