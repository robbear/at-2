import mongoose from "mongoose";

export async function connectDb(uri: string, dbName: string): Promise<void> {
  await mongoose.connect(uri, { dbName });
}

export function getDbState(): "connected" | "disconnected" {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
