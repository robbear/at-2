import { parseEnv } from "./env.js";
import { connectDb } from "./db.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const env = parseEnv();

  await connectDb(env.MONGODB_URI);

  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`API server listening on port ${env.PORT}`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
