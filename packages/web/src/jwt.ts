export function decodeJwt(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function captureTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  const hashParams = new URLSearchParams(hash);
  const tokenParam = hashParams.get('token');
  if (tokenParam) {
    localStorage.setItem('accessToken', tokenParam);
    window.history.replaceState({}, '', window.location.pathname);
    return tokenParam;
  }
  return null;
}