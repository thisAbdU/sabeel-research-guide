import type { NextConfig } from 'next'

const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  // ponytail: dev proxy defaults to 30s; Exa funding runs longer than that
  experimental: {
    proxyTimeout: 180_000,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: origin },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig
