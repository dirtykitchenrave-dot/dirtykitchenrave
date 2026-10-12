import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Artwork comes from Beatport's CDN and is rendered with plain <img>,
  // so no image optimisation config is needed for now.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon' }]
  },
  async redirects() {
    return [
      { source: '/en/podcast', destination: '/en/channels', permanent: true },
      { source: '/es/podcast', destination: '/es/channels', permanent: true },
    ]
  },
}

export default nextConfig
