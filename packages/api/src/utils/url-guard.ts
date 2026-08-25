import dns from 'node:dns/promises';

/**
 * M-ssrf guard for user-supplied URLs (Ad Studio capture). The renderer runs
 * headless Chrome on the API host — without this, a "website link" could
 * probe localhost, the private network, or the cloud metadata endpoint.
 */

const BLOCKED_HOSTNAMES = /^(localhost|metadata\.google\.internal|instance-data)$/i;

export function isPrivateAddress(address: string): boolean {
  if (address.includes('.') && !address.includes(':')) {
    const parts = address.split('.').map(Number);
    // Only dotted QUADS get IPv4 range logic — anything else is a hostname
    // and must be resolved via DNS, not guessed at here.
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n))) return false;
    if (parts.some(n => n < 0 || n > 255)) return true; // malformed v4 → unsafe
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // this-host, private, loopback
    if (a === 169 && b === 254) return true; // link-local (cloud metadata: 169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  const v6 = address.toLowerCase();
  if (v6 === '::' || v6 === '::1') return true;
  if (v6.startsWith('fe80') || v6.startsWith('fc') || v6.startsWith('fd')) return true; // link-local / ULA
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7)); // v4-mapped
  return false;
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.test(host)) return true;
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  if (isPrivateAddress(host)) return true;
  return false;
}

/**
 * Throws unless the URL is a public http(s) address. Resolves DNS and checks
 * EVERY resolved address (a public hostname resolving to 127.0.0.1 is the
 * classic rebinding move). Unresolvable = reject — we do not fetch what we
 * cannot verify.
 */
export async function assertPublicHttpUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked protocol: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error('Credentials in URL are not allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isPrivateHostname(host)) {
    throw new Error(`Blocked host: ${host}`);
  }
  // Literal IPs skip DNS; hostnames must resolve to public addresses only.
  const addresses = await dns.lookup(host, { all: true, verbatim: true }).catch(() => {
    throw new Error(`Could not resolve host: ${host}`);
  });
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(`Host resolves to a private address (${address})`);
    }
  }
}
