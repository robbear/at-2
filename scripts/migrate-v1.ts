/**
 * V1 → V2 data migration script.
 *
 * Prerequisites:
 *   MONGODB_URI     set to the v2 Atlas cluster connection string
 *   MONGODB_URI_V1  set to the v1 Atlas cluster (atlasphere-rob) connection string
 *   Both set in .env.local at repo root
 *
 * Run from repo root:
 *   cd scripts && pnpm migrate-v1
 *
 * Target: atlasphere-v2-dev (hardcoded — never targets production)
 * Safe to re-run: uses upsert, will not duplicate data.
 */

import { createRequire } from "module";
import { randomUUID } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose, { type Connection } from "mongoose";

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
// Env validation
// ---------------------------------------------------------------------------
const MONGODB_URI_V2 = process.env["MONGODB_URI"];
const MONGODB_URI_V1 = process.env["MONGODB_URI_V1"];

if (!MONGODB_URI_V2) {
  console.error("Error: MONGODB_URI is not set.");
  process.exit(1);
}
if (!MONGODB_URI_V1) {
  console.error("Error: MONGODB_URI_V1 is not set.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// V1 document shapes (loosely typed — v1 has no Zod schemas)
// ---------------------------------------------------------------------------
interface V1Profile {
  _id: string; // Cognito sub (UUID string)
  userId: string; // public handle
  email: string;
  name: string;
  awsFederatedId?: string;
  profilePicBase64?: string; // NOT migrated
  createdAt?: Date;
  [key: string]: unknown;
}

interface V1Marker {
  _id: mongoose.Types.ObjectId;
  id: string; // "{userId}/{timestamp}"
  userId: string;
  title: string;
  snippetText?: string;
  snippetImage?: string;
  contentUrl?: string;
  markdown?: string;
  tags?: string[];
  location: { type: "Point"; coordinates: [number, number] };
  datetime?: Date;
  posttime?: Date;
  layerUrl?: string;
  layerType?: "kml" | "geojson" | null;
  markerColors?: { fill: string; outline: string };
  draft?: boolean;
  archived?: boolean;
  deleted?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// V2 document shapes (matching data-model.md)
// ---------------------------------------------------------------------------
interface V2Profile {
  _id: string;
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
}

interface V2Marker {
  _id: string; // "{userId}/{timestamp}"
  userId: string;
  title: string;
  snippetText: string;
  snippetImage?: string;
  contentUrl?: string;
  markdown?: string;
  tags: string[];
  location: { type: "Point"; coordinates: [number, number] };
  datetime?: Date;
  posttime?: Date;
  layerUrl?: string;
  layerType?: "kml" | "geojson" | null;
  markerColors?: { fill: string; outline: string };
  draft: boolean;
  archived: boolean;
  deleted: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildConnections(): {
  v1: Connection;
  v2: Connection;
} {
  // Use createConnection so we can have two independent connections
  const v1 = mongoose.createConnection(MONGODB_URI_V1 as string, {
    dbName: "atlasphere",
  });
  const v2 = mongoose.createConnection(MONGODB_URI_V2 as string, {
    dbName: "atlasphere-v2-dev",
  });
  return { v1, v2 };
}

async function waitReady(conn: Connection, label: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (conn.readyState === 1) {
      resolve();
      return;
    }
    conn.once("open", resolve);
    conn.once("error", (err: Error) => reject(new Error(`${label}: ${String(err)}`)));
  });
}

// ---------------------------------------------------------------------------
// Profile migration
// ---------------------------------------------------------------------------
async function migrateProfiles(
  v1Conn: Connection,
  v2Conn: Connection,
): Promise<Map<string, string>> {
  // cognitoSub → new v2 _id
  const idMap = new Map<string, string>();

  const v1Col = v1Conn.collection<V1Profile>("profiles");
  const v2Col = v2Conn.collection<V2Profile>("profiles");

  const cursor = v1Col.find({});
  let count = 0;

  console.log("Migrating profiles...");

  for await (const doc of cursor) {
    const newId = randomUUID();
    idMap.set(doc._id, newId);

    const v2Doc: V2Profile = {
      _id: newId,
      userId: doc.userId,
      email: doc.email,
      name: doc.name,
      emailVerified: false,
      createdAt: doc.createdAt ?? new Date(),
    };

    await v2Col.updateOne(
      { userId: doc.userId },
      { $set: v2Doc },
      { upsert: true },
    );

    console.log(`  ✓ ${doc.userId}`);
    count++;
  }

  console.log(`Migrated ${count} profiles.\n`);
  return idMap;
}

// ---------------------------------------------------------------------------
// Marker migration
// ---------------------------------------------------------------------------
async function migrateMarkers(
  v1Conn: Connection,
  v2Conn: Connection,
): Promise<void> {
  const v1Col = v1Conn.collection<V1Marker>("markers");
  const v2Col = v2Conn.collection<V2Marker>("markers");

  const total = await v1Col.countDocuments({});
  const cursor = v1Col.find({});

  let processed = 0;
  let skipped = 0;
  const BATCH_SIZE = 100;

  console.log("Migrating markers...");

  for await (const doc of cursor) {
    processed++;

    if (doc.deleted === true) {
      skipped++;
      if (processed % BATCH_SIZE === 0 || processed === total) {
        console.log(`  Processed ${processed} / ${total}`);
      }
      continue;
    }

    const markerId = doc.id; // "{userId}/{timestamp}"

    const v2Doc: V2Marker = {
      _id: markerId,
      userId: doc.userId,
      title: doc.title,
      snippetText: doc.snippetText ?? "",
      tags: doc.tags ?? [],
      location: doc.location,
      draft: doc.draft ?? false,
      archived: doc.archived ?? false,
      deleted: false,
      ...(doc.snippetImage !== undefined && { snippetImage: doc.snippetImage }),
      ...(doc.contentUrl !== undefined && { contentUrl: doc.contentUrl }),
      ...(doc.markdown !== undefined && { markdown: doc.markdown }),
      ...(doc.datetime !== undefined && { datetime: doc.datetime }),
      ...(doc.posttime !== undefined && { posttime: doc.posttime }),
      ...(doc.layerUrl !== undefined && { layerUrl: doc.layerUrl }),
      ...(doc.layerType !== undefined && { layerType: doc.layerType }),
      ...(doc.markerColors !== undefined && { markerColors: doc.markerColors }),
    };

    await v2Col.updateOne({ _id: markerId }, { $set: v2Doc }, { upsert: true });

    if (processed % BATCH_SIZE === 0 || processed === total) {
      console.log(`  Processed ${processed} / ${total}`);
    }
  }

  console.log(
    `Migrated ${processed - skipped} markers (${skipped} skipped as deleted).\n`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const { v1, v2 } = buildConnections();

  await Promise.all([waitReady(v1, "v1"), waitReady(v2, "v2")]);

  try {
    await migrateProfiles(v1, v2);
    await migrateMarkers(v1, v2);
    console.log("Done.");
  } finally {
    await Promise.all([v1.close(), v2.close()]);
  }
}

main().catch((err: unknown) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
