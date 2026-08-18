// Per-account failed-login tracking with progressive backoff. In-memory is
// sufficient for a single-instance free-tier deployment; swap for a DB/redis
// store if the API is ever scaled horizontally.
interface AttemptEntry {
  failures: number;
  lockedUntil: number;
}

const MAX_FAILURES = 5;
const BASE_LOCK_MS = 60_000;

const attempts = new Map<string, AttemptEntry>();

function keyFor(email: string): string {
  return email.toLowerCase().trim();
}

export function isAccountLocked(email: string): { locked: boolean; retryAfterMs?: number } {
  const key = keyFor(email);
  const entry = attempts.get(key);
  if (!entry) return { locked: false };
  if (entry.lockedUntil > Date.now()) {
    return { locked: true, retryAfterMs: entry.lockedUntil - Date.now() };
  }
  return { locked: false };
}

export function recordFailure(email: string) {
  const key = keyFor(email);
  const entry = attempts.get(key) || { failures: 0, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + BASE_LOCK_MS * entry.failures; // progressive backoff
    entry.failures = 0;
  }
  attempts.set(key, entry);
}

export function recordSuccess(email: string) {
  attempts.delete(keyFor(email));
}