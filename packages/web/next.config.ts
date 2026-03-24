import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@at-2/shared"],
  webpack(config) {
    // shared uses NodeNext-style .js extensions in TypeScript source;
    // teach webpack to resolve .js imports as .ts files when processing
    // transpiled workspace packages.
    (config as { resolve: { extensionAlias?: Record<string, string[]> } }).resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
