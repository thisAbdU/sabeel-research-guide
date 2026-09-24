import type { NextConfig } from "next";

const BACKEND_URL = (
  process.env.BACKEND_URL || "https://sabeel-research-guide-backend.vercel.app"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
