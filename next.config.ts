import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Artwork comes from Beatport's CDN and is rendered with plain <img>,
  // so no image optimisation config is needed for now.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon' }]
  },
}

export default nextConfig
