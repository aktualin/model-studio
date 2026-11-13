import { describe, expect, it } from "vitest";
import { cosineSimilarity, embed, EMBEDDING_DIM } from "./local-embedding";

describe("embed", () => {
  it("returns a vector of the configured dimension", () => {
    expect(embed("hello world")).toHaveLength(EMBEDDING_DIM);
  });

  it("is deterministic for the same input", () => {
    expect(embed("What is the capital of France?")).toEqual(
      embed("What is the capital of France?"),
    );
  });

  it("is case- and whitespace-insensitive", () => {
    expect(embed("Hello   World")).toEqual(embed("hello world"));
  });

  it("returns an all-zero vector for empty input", () => {
    expect(embed("")).toEqual(new Array(EMBEDDING_DIM).fill(0));
  });
});

describe("cosineSimilarity", () => {
  it("is ~1 for identical text", () => {
    const a = embed("Summarize this document for me");
    const b = embed("Summarize this document for me");
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("is lower for unrelated text than for near-duplicate text", () => {
    const base = embed("What time is the Jakarta to Singapore flight?");
    const nearDuplicate = embed("what time is the jakarta to singapore flight");
    const unrelated = embed("Please write a haiku about autumn leaves");

    const near = cosineSimilarity(base, nearDuplicate);
    const far = cosineSimilarity(base, unrelated);

    expect(near).toBeGreaterThan(far);
    expect(near).toBeCloseTo(1, 5);
  });
});
