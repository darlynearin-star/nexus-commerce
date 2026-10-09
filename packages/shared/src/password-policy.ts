/**
 * Password policy, shared by the API and every form that accepts a password.
 *
 * This lived only in the API's password-policy module, so the register form
 * had no way to enforce the same rules the server does. It drifted to a 6
 * character minimum while the server required 8, and it never checked for
 * letters-and-numbers at all. A person could type a 6 character password,
 * pass client validation, submit, and be rejected by the API. The
 * reset-password page had already been written correctly against the real
 * rules, so the two forms disagreed with each other.
 *
 * One definition, imported by both sides, so the forms cannot drift again.
 * The server still calls this itself; never rely on the client having checked.
 */
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
