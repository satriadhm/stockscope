/**
 * Input sanitization helpers.
 */

/**
 * Escape a user-supplied string for safe use inside a MongoDB `$regex` and cap
 * its length. Escaping neutralizes regex metacharacters and the length cap
 * mitigates ReDoS (catastrophic-backtracking) denial-of-service attacks.
 */
export function escapeRegex(input: string, maxLength = 100): string {
  return input.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
