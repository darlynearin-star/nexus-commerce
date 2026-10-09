import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@nexus/shared';

// The drift this guards against: the register form checked only 6 characters
// and never checked for letters-and-numbers, while the API required 8 and both.
// A person could pass the form and be rejected by the server. reset-password
// had already been written correctly, so the two forms disagreed with each
// other and with the server.

// vitest runs with cwd = packages/api, so walk up to the repo root rather than
// assuming the storefront sits next door.
const repoRoot = join(process.cwd(), '..', '..');
const storefrontSrc = join(repoRoot, 'packages', 'storefront', 'src');
const apiSrc = join(repoRoot, 'packages', 'api', 'src');
const read = (...p: string[]) => readFileSync(join(storefrontSrc, ...p), 'utf8');

describe('shared password policy', () => {
  it('requires the documented minimum length', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(validatePassword('short1')).toMatch(/at least 8 characters/i);
  });

  it('requires both letters and numbers', () => {
    expect(validatePassword('alllettersonly')).toMatch(/letters and numbers/i);
    expect(validatePassword('12345678')).toMatch(/letters and numbers/i);
  });

  it('accepts a password that satisfies both rules', () => {
    expect(validatePassword('GoodPass1')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(validatePassword('')).toMatch(/at least 8/i);
  });

  // The specific passwords the old client-side check let through.
  it.each([
    ['short1', 'six characters, under the old 6-char client check'],
    ['abcdefgh', 'eight characters, no digits'],
    ['12345678', 'digits only'],
  ])('rejects %s (%s)', (pw) => {
    expect(validatePassword(pw)).not.toBeNull();
  });
});

describe('password forms share the policy instead of restating it', () => {
  const forms: Array<[string, () => string]> = [
    ['app/register/page.tsx', () => read('app', 'register', 'page.tsx')],
    ['app/auth/reset-password/page.tsx', () => read('app', 'auth', 'reset-password', 'page.tsx')],
  ];

  it.each(forms)('%s imports the shared validator', (_name, load) => {
    expect(load()).toMatch(/from '@nexus\/shared'/);
    expect(load()).toMatch(/validatePassword/);
  });

  it.each(forms)('%s has no hand-rolled length or charset rule', (_name, load) => {
    const src = load();
    // Any inline minimum or regex means the form can drift again.
    expect(src).not.toMatch(/password\.length\s*</);
    expect(src).not.toMatch(/\/\[A-Za-z\]\//);
    expect(src).not.toMatch(/minLength=\{?\d/);
  });

  it('the API re-exports the shared policy rather than owning a copy', () => {
    const api = readFileSync(join(apiSrc, 'utils', 'password-policy.ts'), 'utf8');
    expect(api).toMatch(/@nexus\/shared/);
    expect(api).not.toMatch(/PASSWORD_MIN_LENGTH\s*=\s*\d/);
  });
});
