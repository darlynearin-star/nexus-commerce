/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nexus/shared'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;