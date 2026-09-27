/**
 * Password rules, safe to import in the browser (no hashing code here).
 * Length-based per NIST SP 800-63B: no forced character classes, which push
 * people toward predictable patterns.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128; // Bounds hashing cost for hostile input.
