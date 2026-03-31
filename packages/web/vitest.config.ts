import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const sharedAlias = {
  "@at-2/shared": path.resolve(__dirname, "../shared/src/index.ts"),
  "@": path.resolve(__dirname, "./src"),
};

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    projects: [
      {
        resolve: { alias: sharedAlias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: sharedAlias },
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "react",
        },
        test: {
          name: "browser",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/test-utils/setup.ts"],
        },
      },
    ],
  },
});
