import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local from repo root in non-production environments.
// Must run before parseEnv() is called. override: false ensures shell/CI/Vercel
// env vars always take precedence over .env.local values.
if (process.env["NODE_ENV"] !== "production") {
  const dirname = fileURLToPath(new URL(".", import.meta.url));
  config({ path: resolve(dirname, "../../../.env.local"), override: false });
}

import { parseEnv } from "./env.js";
import { connectDb } from "./db.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const env = parseEnv();

  await connectDb(env.MONGODB_URI, env.MONGODB_DB_NAME);

  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`API server listening on port ${env.PORT}`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
