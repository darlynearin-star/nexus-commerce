// Shared password policy. Kept deliberately simple: minimum length plus a
// letters-and-digits check, with a clear message. Applied at registration,
// password reset, and admin user creation.
export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain both letters and numbers';
  }
  return null;
}