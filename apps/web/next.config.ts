import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal workspace packages ship raw TypeScript source (no build step),
  // so Next.js needs to transpile them itself.
  transpilePackages: [
    "@onwei/ui",
    "@onwei/core",
    "@onwei/auth",
    "@onwei/database",
    "@onwei/emails",
  ],
};

export default nextConfig;
