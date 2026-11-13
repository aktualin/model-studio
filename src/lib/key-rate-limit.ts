import "server-only";

interface Window {
  count: number;
  resetAt: number;
}

// In-memory, per-instance limiter keyed by ApiKey.id. Good enough for a
// single-instance deployment; swap for a distributed store (e.g. Upstash
// Redis) if this ever runs across multiple serverless instances at once.
const requestWindows = new Map<string, Window>();
const tokenWindows = new Map<string, Window>();

export interface LimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

function peekWindow(map: Map<string, Window>, key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const window = map.get(key);
  if (!window || window.resetAt <= now) {
    return { allowed: true, retryAfterMs: 0 };
  }
  if (window.count >= limit) {
    return { allowed: false, retryAfterMs: window.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Checks and consumes one request against the key's requests-per-second limit. */
export function checkRequestRate(apiKeyId: string, requestsPerSecond: number): LimitResult {
  const now = Date.now();
  const result = peekWindow(requestWindows, apiKeyId, requestsPerSecond, 1_000);
  if (!result.allowed) {
    return result;
  }
  const window = requestWindows.get(apiKeyId);
  if (!window || window.resetAt <= now) {
    requestWindows.set(apiKeyId, { count: 1, resetAt: now + 1_000 });
  } else {
    window.count += 1;
  }
  return result;
}

/** Checks (without consuming) whether the key still has token budget left this minute. */
export function checkTokenBudget(apiKeyId: string, tokensPerMinute: number): LimitResult {
  return peekWindow(tokenWindows, apiKeyId, tokensPerMinute, 60_000);
}

/** Records tokens actually spent, once the upstream response reports usage. */
export function recordTokenUsage(apiKeyId: string, tokens: number): void {
  if (tokens <= 0) return;
  const now = Date.now();
  const window = tokenWindows.get(apiKeyId);
  if (!window || window.resetAt <= now) {
    tokenWindows.set(apiKeyId, { count: tokens, resetAt: now + 60_000 });
  } else {
    window.count += tokens;
  }
}
