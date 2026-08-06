/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required by the production Docker image. This keeps the runtime image
  // small while retaining the Node modules traced by Next.js.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

module.exports = nextConfig
