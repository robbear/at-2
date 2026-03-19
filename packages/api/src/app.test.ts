import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "./app.js";
import { connectDb, disconnectDb, getDbState } from "./db.js";
import { parseEnv } from "./env.js";
import type { FastifyInstance } from "fastify";

describe("Health check route", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health returns 200 with correct shape", async () => {
    const response = await supertest(app.server).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      db: expect.stringMatching(/^(connected|disconnected)$/),
    });
  });
});

describe("MongoDB Atlas connection", () => {
  afterAll(async () => {
    await disconnectDb();
  });

  it("connects to the real Atlas cluster using MONGODB_URI_TEST from environment", async () => {
    const uri = process.env["MONGODB_URI_TEST"];
    if (!uri) {
      throw new Error(
        "MONGODB_URI_TEST is not set — set it to your Atlas connection string to run this test"
      );
    }

    await connectDb(uri, "atlasphere-v2-test");
    const state = getDbState();
    expect(state).toBe("connected");
  });

  it("health route reports db as connected after successful connection", async () => {
    // This test depends on the previous test having connected successfully.
    // If the connection is not established, this will reflect disconnected state.
    const app = await buildApp();
    await app.ready();
    const response = await supertest(app.server).get("/api/v1/health");
    expect(response.status).toBe(200);
    // After the Atlas connection test above, getDbState() should return "connected".
    expect(response.body).toEqual({ status: "ok", db: "connected" });
    await app.close();
  });
});

describe("Env var validation", () => {
  it("parseEnv throws when MONGODB_URI is missing", () => {
    const original = process.env["MONGODB_URI"];
    delete process.env["MONGODB_URI"];

    try {
      expect(() => parseEnv()).toThrow("MONGODB_URI");
    } finally {
      if (original !== undefined) {
        process.env["MONGODB_URI"] = original;
      }
    }
  });
});
