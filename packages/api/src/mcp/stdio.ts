/**
 * Standalone stdio entry point for local development with Claude Desktop.
 *
 * Loads .env.local, connects to MongoDB, and runs the Atlasphere MCP server
 * over stdio. The authenticated user is identified by the ATLAS_USER_ID
 * environment variable — appropriate because this process runs on the local
 * machine and is launched directly by the machine owner.
 *
 * Claude Desktop config:
 *   {
 *     "command": "/path/to/tsx",
 *     "args": ["/path/to/packages/api/src/mcp/stdio.ts"],
 *     "env": { "ATLAS_USER_ID": "your-handle" }
 *   }
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.local from repo root before any other imports so env vars are
// available to parseEnv() and mongoose.connect().
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const { config } = await import("dotenv");
config({ path: resolve(repoRoot, ".env.local") });

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from "mongoose";
import { createMcpServer } from "./server.js";
import { setStdioContext } from "./context.js";

const userId = process.env["ATLAS_USER_ID"];
if (!userId) {
  process.stderr.write("[atlasphere-mcp] Error: ATLAS_USER_ID must be set\n");
  process.exit(1);
}

const mongoUri = process.env["MONGODB_URI"];
if (!mongoUri) {
  process.stderr.write("[atlasphere-mcp] Error: MONGODB_URI not found — check .env.local\n");
  process.exit(1);
}

const dbName = process.env["MONGODB_DB_NAME"] ?? "atlasphere-v2-dev";

try {
  await mongoose.connect(mongoUri, { dbName });
  process.stderr.write(`[atlasphere-mcp] Connected to MongoDB (${dbName})\n`);
} catch (err) {
  process.stderr.write(`[atlasphere-mcp] Error: MongoDB connection failed: ${err}\n`);
  process.exit(1);
}

// Set user context for the lifetime of this process. The StdioServerTransport
// fires stdin events outside the AsyncLocalStorage scope, so we use the
// module-level fallback instead of atlasContextStore.run().
setStdioContext({ user: { id: userId, email: "", userId } });

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
