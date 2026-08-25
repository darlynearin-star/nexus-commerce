export function decodeJwt(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Handoff-token gate (token-fixation defense): a `#token=` link from ANY
 * source — trusted SSO redirect or a crafted attacker URL — is only accepted
 * when it is a structurally valid, unexpired session token. Junk, malformed,
 * or expired tokens are discarded instead of silently replacing an existing
 * session. (This does not certify the token's origin — that is inherent to
 * fragment handoff — but it blocks the overwrite-with-garbage and
 * overwrite-with-expired variants of the fixation attack.)
 */
export function isAcceptableHandoffToken(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.userId || !payload.role) return false;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 > Date.now() - 30_000; // 30s clock-skew allowance
}

export function captureTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const tokenParam = new URLSearchParams(hash).get('token');
  // Strip the handoff from the address bar unconditionally — a crafted
  // #token= link must never linger in history or be re-captured on reload.
  window.history.replaceState({}, '', window.location.pathname);
  if (!tokenParam) return null;
  if (!isAcceptableHandoffToken(tokenParam)) return null;
  localStorage.setItem('accessToken', tokenParam);
  return tokenParam;
}
