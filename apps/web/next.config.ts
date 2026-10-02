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
  // The pre-launch page moved from /waitlist to /ontheway. Keep old links,
  // bookmarks and anything already indexed working with a permanent redirect.
  async redirects() {
    return [{ source: "/waitlist", destination: "/ontheway", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    // Admin's product-image upload writes real Vercel Blob URLs
    // (apps/admin/app/api/products/[id]/images/route.ts) into
    // ProductImage.url, which next/image refuses to render unless the host
    // is allowlisted. Only seeded local /public paths have been used so
    // far, which is why this was never exercised end-to-end.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
