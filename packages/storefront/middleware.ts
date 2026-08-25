import { NextResponse, type NextRequest } from 'next/server';

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://nexus-api-69q5.onrender.com';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${apiUrl} https://nexus-api-69q5.onrender.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function middleware(request: NextRequest) {
  if (!process.env.CSP_NONCE) return NextResponse.next();

  const nonce = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
