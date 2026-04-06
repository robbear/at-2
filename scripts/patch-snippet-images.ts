/**
 * Patch legacy V1 snippetImage paths in atlasphere-v2-dev.
 *
 * V1 markers were migrated with relative snippetImage paths (e.g. "some/path/image.jpg").
 * The images still live in S3. This script prepends the S3 base URL to any
 * snippetImage value that is not already a fully-qualified URL (i.e. does not
 * start with "http://" or "https://").
 *
 * Prerequisites:
 *   MONGODB_URI  set to the v2 Atlas cluster connection string (in .env.local)
 *
 * Run from scripts/:
 *   cd scripts && pnpm patch-snippet-images
 *
 * Target: atlasphere-v2-dev (hardcoded — never targets production)
 * Safe to re-run: only updates records whose snippetImage is still relative.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Load .env.local from repo root
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MONGODB_URI = process.env["MONGODB_URI"];
if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not set.");
  process.exit(1);
}

const DB_NAME = "atlasphere-v2-dev";
const S3_BASE = "https://atlasphere.s3.amazonaws.com/";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const conn = mongoose.createConnection(MONGODB_URI as string, {
    dbName: DB_NAME,
  });

  await new Promise<void>((resolve, reject) => {
    if (conn.readyState === 1) { resolve(); return; }
    conn.once("open", resolve);
    conn.once("error", (err: Error) => reject(err));
  });

  console.log(`Connected to ${DB_NAME}`);

  const col = conn.collection("markers");

  // Find all markers that have a snippetImage that is NOT already a full URL.
  // A relative path will not start with "http://" or "https://".
  const cursor = col.find({
    snippetImage: { $exists: true, $not: /^https?:\/\// },
  });

  const total = await col.countDocuments({
    snippetImage: { $exists: true, $not: /^https?:\/\// },
  });

  console.log(`Found ${total} markers with relative snippetImage paths.\n`);

  if (total === 0) {
    console.log("Nothing to patch.");
    await conn.close();
    return;
  }

  let updated = 0;
  let errors = 0;

  for await (const doc of cursor) {
    const relative = doc["snippetImage"] as string;
    // Strip any leading slash so we don't produce double-slash URLs.
    const normalized = relative.startsWith("/") ? relative.slice(1) : relative;
    const fullUrl = `${S3_BASE}${normalized}`;

    try {
      await col.updateOne(
        { _id: doc._id },
        { $set: { snippetImage: fullUrl } },
      );
      console.log(`  ✓ ${String(doc._id)}  ${relative}  →  ${fullUrl}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ${String(doc._id)}:`, err);
      errors++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);

  await conn.close();
}

main().catch((err: unknown) => {
  console.error("Script failed:", err);
  process.exit(1);
});
