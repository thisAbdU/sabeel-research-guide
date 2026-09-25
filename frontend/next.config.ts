import type { NextConfig } from "next";

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://sabeel-research-guide-backend.vercel.app"
    : "http://localhost:3001")
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
