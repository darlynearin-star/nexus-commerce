import { describe, it, expect, vi } from 'vitest';
import { isPrivateAddress, isPrivateHostname, assertPublicHttpUrl } from '../utils/url-guard';

// Deterministic DNS: some resolvers hijack NXDOMAIN (e.g. .invalid), so the
// unresolvable-host test mocks lookup instead of trusting the network.
vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(async (host: string) => {
      if (host.endsWith('.invalid')) throw new Error('NXDOMAIN');
      return [{ address: '93.184.216.34', family: 4 }];
    }),
  },
}));

describe('M-ssrf: URL guard', () => {
  it('flags private/loopback/link-local/metadata IPv4', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('10.0.0.5')).toBe(true);
    expect(isPrivateAddress('172.16.0.1')).toBe(true);
    expect(isPrivateAddress('172.31.255.255')).toBe(true);
    expect(isPrivateAddress('192.168.1.1')).toBe(true);
    expect(isPrivateAddress('169.254.169.254')).toBe(true); // cloud metadata
    expect(isPrivateAddress('0.0.0.0')).toBe(true);
    expect(isPrivateAddress('100.64.0.1')).toBe(true); // CGNAT
  });

  it('allows public IPv4', () => {
    expect(isPrivateAddress('142.250.185.78')).toBe(false);
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
  });

  it('flags IPv6 loopback/ULA/link-local and v4-mapped', () => {
    expect(isPrivateAddress('::1')).toBe(true);
    expect(isPrivateAddress('fd00::1')).toBe(true);
    expect(isPrivateAddress('fe80::1')).toBe(true);
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true);
  });

  it('flags dangerous hostnames', () => {
    expect(isPrivateHostname('localhost')).toBe(true);
    expect(isPrivateHostname('metadata.google.internal')).toBe(true);
    expect(isPrivateHostname('service.internal')).toBe(true);
    expect(isPrivateHostname('printer.local')).toBe(true);
    expect(isPrivateHostname('example.com')).toBe(false);
  });

  it('rejects non-http(s) protocols and embedded credentials', async () => {
    await expect(assertPublicHttpUrl('file:///etc/passwd')).rejects.toThrow(/protocol/i);
    await expect(assertPublicHttpUrl('ftp://example.com')).rejects.toThrow(/protocol/i);
    await expect(assertPublicHttpUrl('https://user:pass@example.com')).rejects.toThrow(/credentials/i);
  });

  it('rejects literal private targets without DNS', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1:4000/api/health')).rejects.toThrow(/Blocked host/i);
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/Blocked host/i);
    await expect(assertPublicHttpUrl('http://localhost/admin')).rejects.toThrow(/Blocked host/i);
    await expect(assertPublicHttpUrl('http://10.0.0.12/')).rejects.toThrow(/Blocked host/i);
  });

  it('rejects unresolvable hostnames (never fetch what we cannot verify)', async () => {
    await expect(assertPublicHttpUrl('https://this-domain-does-not-exist-xyz.invalid')).rejects.toThrow(/resolve/i);
  });
});
