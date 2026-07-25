/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nexus/shared'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' },
    ];
  },
};

module.exports = nextConfig;