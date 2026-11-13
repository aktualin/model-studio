import "server-only";
import { embed } from "@/lib/local-embedding";
import { insertEntry, isSemanticCacheConfigured, searchSimilar } from "@/lib/zilliz-client";

const DEFAULT_THRESHOLD = 0.93;

function getThreshold(): number {
  const parsed = Number.parseFloat(process.env.SEMANTIC_CACHE_THRESHOLD ?? "");
  return Number.isFinite(parsed) ? parsed : DEFAULT_THRESHOLD;
}

export interface CacheHit {
  answerText: string;
  distance: number;
}

/**
 * Looks for a near-duplicate prompt already answered before. Every failure
 * mode (Zilliz down, not configured, bad response, ...) resolves to `null`
 * rather than throwing — callers always fall through to calling the model.
 */
export async function findCachedAnswer(promptText: string): Promise<CacheHit | null> {
  if (!isSemanticCacheConfigured() || !promptText.trim()) return null;

  try {
    const vector = embed(promptText);
    const [best] = await searchSimilar(vector, 1);
    if (best && best.distance >= getThreshold() && best.answerText) {
      return { answerText: best.answerText, distance: best.distance };
    }
    return null;
  } catch {
    return null;
  }
}

/** Fire-and-forget: stores a fresh prompt/answer pair for future reuse. */
export function storeAnswer(promptText: string, answerText: string): void {
  if (!isSemanticCacheConfigured() || !promptText.trim() || !answerText.trim()) return;

  void insertEntry(embed(promptText), promptText, answerText).catch(() => undefined);
}
