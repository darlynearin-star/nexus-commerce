/**
 * H9: secret masking for the lower DEVELOPER tier. SUPER_DEVELOPER (the
 * platform owner) still sees raw values; DEVELOPER gets `••••last4` so the
 * dashboard shows "what is configured" without exposing credentials.
 */
const SECRET_PATTERN = /(SECRET|PASSWORD|_KEY|TOKEN)/i;
// Key shapes that match the secret pattern but are meant to be public/config.
const PUBLIC_OK = /(PUBLIC_KEY|PUBLIC_BASE_URL|_FROM_EMAIL|FROM_NAME|_URL$|_ENABLED|_LAST_TESTED|_IPN_URL|_BASE_URL)/i;

export function isSecretKey(key: string): boolean {
  return SECRET_PATTERN.test(key) && !PUBLIC_OK.test(key);
}

export function maskValue(value: unknown): string {
  const s = String(value ?? '');
  return s.length > 8 ? `••••${s.slice(-4)}` : '••••';
}

export function maskSettingsForRole(role: string, settings: Record<string, any>): Record<string, any> {
  if (role === 'SUPER_DEVELOPER') return settings;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(settings)) {
    out[key] = isSecretKey(key) && value != null && value !== '' ? maskValue(value) : value;
  }
  return out;
}

/** True when a submitted value is just an echoed mask — never persist it. */
export function isMaskPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('••••');
}
