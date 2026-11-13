/**
 * Constant-time string comparison, safe for credential checks. Written
 * without Node's `crypto` module so it also works in the Edge runtime
 * (this is reachable from middleware).
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
