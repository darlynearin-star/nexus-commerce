// The policy itself now lives in @nexus/shared so the forms that accept a
// password can enforce exactly the same rules the server does. It used to
// live here alone, and the register form drifted to a 6 character minimum with
// no letters-and-numbers check, so people were rejected after submitting.
//
// This module stays so existing `from '../utils/password-policy'` imports keep
// working, but it no longer owns the rules.
export { PASSWORD_MIN_LENGTH, validatePassword } from '@nexus/shared';
