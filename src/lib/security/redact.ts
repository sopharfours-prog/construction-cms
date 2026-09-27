const SENSITIVE_KEY =
  /pass(word)?|secret|token|hash|salt|api[-_]?key|authorization|cookie|session/i;

/**
 * Deep-copies a value for logging, replacing sensitive fields with "[REDACTED]".
 * Applied to every audit-log snapshot, so a password hash or reset token can
 * never end up in the audit trail.
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSecrets(entry, depth + 1);
  }
  return result;
}
