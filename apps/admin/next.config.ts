import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@onwei/ui",
    "@onwei/core",
    "@onwei/auth",
    "@onwei/database",
    "@onwei/emails",
  ],
};

export default nextConfig;
