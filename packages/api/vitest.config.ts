import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  // Load .env / .env.local from the monorepo root so MONGODB_URI_TEST etc. are
  // available in tests when running locally. CI injects these as secrets.
  envDir: repoRoot,
  resolve: {
    alias: {
      // Resolve @at-2/shared from TypeScript source during tests.
      "@at-2/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      // parseEnv() is called inside route handlers; these satisfy its schema.
      // MONGODB_URI is not used for actual connections in tests (MONGODB_URI_TEST
      // is passed explicitly to connectDb() in beforeAll hooks).
      MONGODB_URI: "mongodb://localhost:27017/atlasphere-test",
      MONGODB_DB_NAME: "atlasphere-v2-test",
      AUTH_SECRET: "test-secret-do-not-use-in-production-must-be-32-chars",
      // R2 vars needed because parseEnv() runs at startup; S3 calls are mocked in tests.
      R2_ACCOUNT_ID: "test-r2-account-id",
      R2_ACCESS_KEY_ID: "test-r2-access-key-id",
      R2_SECRET_ACCESS_KEY: "test-r2-secret-access-key",
      R2_BUCKET_NAME: "test-bucket",
      R2_PUBLIC_URL: "https://test-r2.example.com",
    },
  },
});
