import { MongoClient } from "mongodb";

export interface DbStats {
  storageMB: number;
  markerCount: number;
  profileCount: number;
}

interface DbStatsCommand {
  storageSize?: number;
  indexSize?: number;
  totalSize?: number;
}

export async function fetchDbStats(): Promise<DbStats | null> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME ?? "atlasphere-v2";
  if (!uri) return null;

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const [statsDoc, markerCount, profileCount] = await Promise.all([
      db.command({ dbStats: 1 }) as Promise<DbStatsCommand>,
      db.collection("markers").countDocuments(),
      db.collection("profiles").countDocuments(),
    ]);
    const totalBytes =
      (statsDoc.storageSize ?? 0) + (statsDoc.indexSize ?? 0);
    const storageMB = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
    console.log(`[db-stats] storage: ${storageMB}MB, markers: ${markerCount}, profiles: ${profileCount}`);
    return { storageMB, markerCount, profileCount };
  } catch (err) {
    console.error("[db-stats] fetch failed", err);
    return null;
  } finally {
    await client.close();
  }
}
