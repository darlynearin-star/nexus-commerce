import crypto from 'crypto';

/**
 * Length-safe constant-time string comparison for secrets (webhook signatures,
 * API keys). timingSafeEqual throws on length mismatch, and early-return on
 * length alone leaks a length oracle — so mismatched lengths still burn a
 * comparison of the caller's own length against itself.
 */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}
