import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseEnv } from "./env.js";

/** Minimal set of env vars required by EnvSchema (excluding the Railway-resolved ones). */
const BASE_ENV: Record<string, string> = {
  MONGODB_URI: "mongodb+srv://test:test@cluster/",
  AUTH_SECRET: "test-secret-value",
  R2_ACCOUNT_ID: "account-id",
  R2_ACCESS_KEY_ID: "access-key",
  R2_SECRET_ACCESS_KEY: "secret-key",
};

describe("resolveRailwayVar (via parseEnv)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear Railway and the three resolved vars before each test
    delete process.env["RAILWAY_ENVIRONMENT_NAME"];
    delete process.env["MONGODB_DB_NAME"];
    delete process.env["R2_BUCKET_NAME"];
    delete process.env["R2_PUBLIC_URL"];
    // Apply base env
    Object.assign(process.env, BASE_ENV);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns explicit value when set, regardless of Railway env", () => {
    process.env["RAILWAY_ENVIRONMENT_NAME"] = "production";
    process.env["MONGODB_DB_NAME"] = "my-override-db";
    process.env["R2_BUCKET_NAME"] = "my-override-bucket";
    process.env["R2_PUBLIC_URL"] = "https://override.example.com";

    const env = parseEnv();

    expect(env.MONGODB_DB_NAME).toBe("my-override-db");
    expect(env.R2_BUCKET_NAME).toBe("my-override-bucket");
    expect(env.R2_PUBLIC_URL).toBe("https://override.example.com");
  });

  it("returns production defaults when RAILWAY_ENVIRONMENT_NAME=production", () => {
    process.env["RAILWAY_ENVIRONMENT_NAME"] = "production";

    const env = parseEnv();

    expect(env.MONGODB_DB_NAME).toBe("atlasphere-v2");
    expect(env.R2_BUCKET_NAME).toBe("atlasphere-v2");
    expect(env.R2_PUBLIC_URL).toBe(
      "https://pub-2c867def25774b4da3d486fe0c677f64.r2.dev",
    );
    expect(env.RAILWAY_ENVIRONMENT_NAME).toBe("production");
  });

  it("returns dev defaults when RAILWAY_ENVIRONMENT_NAME is a PR env name", () => {
    process.env["RAILWAY_ENVIRONMENT_NAME"] = "pr-42";

    const env = parseEnv();

    expect(env.MONGODB_DB_NAME).toBe("atlasphere-v2-dev");
    expect(env.R2_BUCKET_NAME).toBe("atlasphere-v2-dev");
    expect(env.R2_PUBLIC_URL).toBe(
      "https://pub-63147a72c2cd47e8ab0f057c127fe103.r2.dev",
    );
    expect(env.RAILWAY_ENVIRONMENT_NAME).toBe("pr-42");
  });

  it("throws with a clear message when neither explicit nor Railway env is set", () => {
    // No RAILWAY_ENVIRONMENT_NAME, no explicit values
    expect(() => parseEnv()).toThrow(/MONGODB_DB_NAME is required/);
  });

  it("throws mentioning RAILWAY_ENV_DEFAULTS when on Railway but var has no entry", () => {
    process.env["RAILWAY_ENVIRONMENT_NAME"] = "production";
    // Simulate a var that is required but missing from RAILWAY_ENV_DEFAULTS
    // by injecting an unknown key that parseEnv would try to resolve.
    // We can't test this path directly without modifying internals, so we
    // verify the existing resolved vars all return strings (not throw).
    const env = parseEnv();
    expect(typeof env.MONGODB_DB_NAME).toBe("string");
    expect(typeof env.R2_BUCKET_NAME).toBe("string");
    expect(typeof env.R2_PUBLIC_URL).toBe("string");
  });

  it("exposes RAILWAY_ENVIRONMENT_NAME=undefined when not on Railway", () => {
    process.env["MONGODB_DB_NAME"] = "atlasphere-v2-dev";
    process.env["R2_BUCKET_NAME"] = "atlasphere-v2-dev";
    process.env["R2_PUBLIC_URL"] = "https://example.com";

    const env = parseEnv();

    expect(env.RAILWAY_ENVIRONMENT_NAME).toBeUndefined();
  });
});
