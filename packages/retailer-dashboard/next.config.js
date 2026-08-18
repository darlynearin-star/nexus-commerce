/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://nexus-api-69q5.onrender.com';

const csp = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src': "'self' https://fonts.gstatic.com",
  'img-src': "'self' data: blob: https:",
  'connect-src': `'self' ${apiUrl} https://nexus-api-69q5.onrender.com`,
  'frame-ancestors': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
};

const nextConfig = {
  transpilePackages: ['@nexus/shared'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.unshift({ key: 'Content-Security-Policy', value: Object.entries(csp).map(([k, v]) => `${k} ${v}`).join('; ') });
    }
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;