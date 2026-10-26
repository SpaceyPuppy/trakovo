/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required by the production Docker image. This keeps the runtime image
  // small while retaining the Node modules traced by Next.js.
  output: 'standalone',
  images: {
    // Vehicle imagery uses ordinary <img> elements. Do not expose an arbitrary
    // remote-image proxy through Next's image optimisation endpoint.
    remotePatterns: [],
    dangerouslyAllowSVG: false,
    dangerouslyAllowLocalIP: false,
  },
  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },
}

module.exports = nextConfig
