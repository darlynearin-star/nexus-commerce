import { describe, it, expect } from 'vitest';
import { uploadBlockReason, getUploadLimits } from './upload';

describe('uploadBlockReason', () => {
  const limits = { daily: 100, total: 500 };

  it('allows uploads below both limits', () => {
    expect(uploadBlockReason(3, 120, limits)).toBeNull();
  });

  it('blocks once the daily cap is hit', () => {
    expect(uploadBlockReason(100, 120, limits)).toContain('Daily upload limit');
    expect(uploadBlockReason(101, 120, limits)).toContain('Daily upload limit');
  });

  it('blocks once the total cap is hit, even below the daily cap', () => {
    expect(uploadBlockReason(5, 500, limits)).toContain('Storage limit');
  });

  it('respects env-tunable limits', () => {
    const env = { UPLOAD_DAILY_LIMIT: '7', UPLOAD_TOTAL_LIMIT: '50' };
    const l = getUploadLimits(env as NodeJS.ProcessEnv);
    expect(l).toEqual({ daily: 7, total: 50 });
    expect(uploadBlockReason(7, 3, l)).toContain('Daily upload limit');
    expect(uploadBlockReason(1, 50, l)).toContain('Storage limit');
  });

  it('defaults sensibly when env is missing', () => {
    expect(getUploadLimits({} as NodeJS.ProcessEnv)).toEqual({ daily: 100, total: 500 });
  });
});