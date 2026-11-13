import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "./api-keys";

describe("generateApiKey", () => {
  it("produces a secret with the expected prefix and a matching hash", () => {
    const { secret, keyPrefix, hashedKey } = generateApiKey();

    expect(secret.startsWith("sk-ms-")).toBe(true);
    expect(keyPrefix).toBe(secret.slice(0, 12));
    expect(hashedKey).toBe(hashApiKey(secret));
  });

  it("never generates the same secret twice", () => {
    const a = generateApiKey();
    const b = generateApiKey();

    expect(a.secret).not.toBe(b.secret);
    expect(a.hashedKey).not.toBe(b.hashedKey);
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    expect(hashApiKey("sk-ms-same-input")).toBe(hashApiKey("sk-ms-same-input"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashApiKey("sk-ms-a")).not.toBe(hashApiKey("sk-ms-b"));
  });
});
