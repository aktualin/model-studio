/**
 * Zero-dependency, zero-API-call "embedding" used for the semantic cache.
 * It's a classic hashing-trick bag-of-words vector, not a real learned
 * embedding — it catches near-identical / heavily-overlapping prompts, not
 * true paraphrase semantics. No embedding provider credentials were
 * supplied, so this trades recall for the ability to run entirely offline;
 * swap in a real embedding API here if one becomes available.
 */
export const EMBEDDING_DIM = 256;

function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function embed(text: string, dim: number = EMBEDDING_DIM): number[] {
  const vector = new Array<number>(dim).fill(0);
  const tokens = normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    const h = hash32(token);
    const bucket = h % dim;
    const sign = h & 1 ? 1 : -1;
    vector[bucket] += sign;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}
