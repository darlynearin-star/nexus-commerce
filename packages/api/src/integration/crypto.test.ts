import { describe, it, expect } from 'vitest';
import { safeEqual } from '../utils/crypto';

describe('M-timing: safeEqual', () => {
  it('matches identical secrets', () => {
    expect(safeEqual('whsec_abc123', 'whsec_abc123')).toBe(true);
  });

  it('rejects different secrets of equal length', () => {
    expect(safeEqual('whsec_abc123', 'whsec_xyz789')).toBe(false);
  });

  it('rejects different-length secrets without throwing', () => {
    expect(safeEqual('short', 'a-much-longer-secret')).toBe(false);
    expect(safeEqual('', 'something')).toBe(false);
  });

  it('handles unicode safely', () => {
    expect(safeEqual('sécret-éé', 'sécret-éé')).toBe(true);
    expect(safeEqual('sécret-éé', 'sécret-éa')).toBe(false);
  });
});
