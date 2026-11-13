import "server-only";
import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "sk-ms-";
const PREFIX_VISIBLE_CHARS = 12;

export interface GeneratedApiKey {
  /** Full secret — only ever available at creation time, never stored. */
  secret: string;
  /** Short, non-secret prefix kept for display (e.g. "sk-ms-ab12cd"). */
  keyPrefix: string;
  /** SHA-256 hash of the secret, stored in the database for lookup. */
  hashedKey: string;
}

export function generateApiKey(): GeneratedApiKey {
  const secret = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    secret,
    keyPrefix: secret.slice(0, PREFIX_VISIBLE_CHARS),
    hashedKey: hashApiKey(secret),
  };
}

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
