import "server-only";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/api-keys";
import { checkRequestRate, checkTokenBudget, recordTokenUsage } from "@/lib/key-rate-limit";

// Headers that must never be forwarded as-is between client <-> proxy <-> upstream.
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

interface UpstreamTarget {
  baseUrl: string;
  authHeaderName: string;
  authHeaderValue: string;
  extraHeaders?: Record<string, string>;
}

function getUpstreamTarget(): UpstreamTarget {
  const provider = process.env.AI_PROVIDER ?? "anthropic";

  if (provider === "modelstudio") {
    const baseUrl = process.env.MODEL_STUDIO_BASE_URL;
    const apiKey = process.env.MODEL_STUDIO_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error("MODEL_STUDIO_BASE_URL / MODEL_STUDIO_API_KEY belum diset di server.");
    }
    return { baseUrl, authHeaderName: "authorization", authHeaderValue: `Bearer ${apiKey}` };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY belum diset di server.");
  }
  // ANTHROPIC_BASE_URL lets this point at any Anthropic-compatible host
  // (e.g. an Aliyun Model Studio Token Plan endpoint) instead of the real
  // Anthropic API. Our route is mounted at /api/v1/*, so the captured path
  // never includes "v1" — bake it into the base so e.g. /api/v1/messages
  // forwards to "<base>/v1/messages".
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  return {
    baseUrl: `${base}/v1`,
    authHeaderName: "x-api-key",
    authHeaderValue: apiKey,
    extraHeaders: { "anthropic-version": "2023-06-01" },
  };
}

export interface AuthenticatedKey {
  id: string;
}

type AuthResult = { ok: true; key: AuthenticatedKey } | { ok: false; response: Response };

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

function proxyError(status: number, message: string, retryAfterMs?: number): Response {
  return Response.json(
    { error: { message, type: "proxy_error" } },
    {
      status,
      headers: retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined,
    },
  );
}

/** Validates the caller's virtual API key and enforces its rate limits. */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const secret = request.headers.get("x-api-key") ?? bearerToken(request.headers.get("authorization"));
  if (!secret) {
    return {
      ok: false,
      response: proxyError(401, "Header x-api-key (atau Authorization: Bearer <key>) wajib diisi."),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey: hashApiKey(secret) } });
  if (!apiKey) {
    return { ok: false, response: proxyError(401, "API key tidak valid.") };
  }
  if (apiKey.revokedAt) {
    return { ok: false, response: proxyError(401, "API key sudah dicabut.") };
  }
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
    return { ok: false, response: proxyError(401, "API key sudah kedaluwarsa.") };
  }

  const requestRate = checkRequestRate(apiKey.id, apiKey.requestsPerSecond);
  if (!requestRate.allowed) {
    return { ok: false, response: proxyError(429, "Limit permintaan per detik tercapai.", requestRate.retryAfterMs) };
  }

  const tokenBudget = checkTokenBudget(apiKey.id, apiKey.tokensPerMinute);
  if (!tokenBudget.allowed) {
    return { ok: false, response: proxyError(429, "Limit token per menit tercapai.", tokenBudget.retryAfterMs) };
  }

  return { ok: true, key: { id: apiKey.id } };
}

function filterHeaders(headers: Headers, extraExclude: string[] = []): Headers {
  const excluded = new Set([...HOP_BY_HOP_HEADERS, ...extraExclude.map((h) => h.toLowerCase())]);
  const result = new Headers();
  for (const [key, value] of headers) {
    if (!excluded.has(key.toLowerCase())) {
      result.set(key, value);
    }
  }
  return result;
}

function extractTokenUsage(raw: string): number | null {
  const totalMatches = [...raw.matchAll(/"total_tokens"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (totalMatches.length > 0) {
    return Math.max(...totalMatches);
  }
  const inputMatches = [...raw.matchAll(/"input_tokens"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  const outputMatches = [...raw.matchAll(/"output_tokens"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (inputMatches.length === 0 && outputMatches.length === 0) {
    return null;
  }
  const inputTokens = inputMatches.length ? Math.max(...inputMatches) : 0;
  const outputTokens = outputMatches.length ? Math.max(...outputMatches) : 0;
  return inputTokens + outputTokens;
}

async function recordRequest(apiKeyId: string): Promise<void> {
  await prisma.apiKey
    .update({ where: { id: apiKeyId }, data: { requestCount: { increment: 1 }, lastUsedAt: new Date() } })
    .catch(() => undefined);
}

/** A semantic-cache hit: served without an upstream call, so no tokens spent. */
export async function recordCacheHit(apiKeyId: string): Promise<void> {
  await recordRequest(apiKeyId);
}

async function recordTokens(apiKeyId: string, tokens: number): Promise<void> {
  recordTokenUsage(apiKeyId, tokens);
  await prisma.apiKey
    .update({ where: { id: apiKeyId }, data: { tokenCount: { increment: tokens } } })
    .catch(() => undefined);
}

export interface ForwardOptions {
  /** Pre-read (and possibly rewritten) body text, in place of reading `request` again. */
  bodyTextOverride?: string;
  /** Called with the fully-buffered response text once the stream finishes. */
  onResponseText?: (text: string) => void;
}

/**
 * Forwards the request byte-for-byte to the configured upstream provider and
 * streams the raw response straight back — no reparsing of the Anthropic /
 * OpenAI-compatible message format, by design.
 */
export async function forwardToUpstream(
  request: Request,
  path: string[],
  apiKeyId: string,
  options: ForwardOptions = {},
): Promise<Response> {
  let target: UpstreamTarget;
  try {
    target = getUpstreamTarget();
  } catch (error) {
    return proxyError(500, error instanceof Error ? error.message : "Provider belum dikonfigurasi di server.");
  }

  const upstreamUrl = new URL(`${target.baseUrl}/${path.join("/")}`);
  upstreamUrl.search = new URL(request.url).search;

  const headers = filterHeaders(request.headers, ["x-api-key", "authorization"]);
  headers.set(target.authHeaderName, target.authHeaderValue);
  if (target.extraHeaders) {
    for (const [key, value] of Object.entries(target.extraHeaders)) {
      if (!headers.has(key)) headers.set(key, value);
    }
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const bodyText = options.bodyTextOverride ?? (hasBody ? await request.text() : undefined);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: bodyText,
      signal: request.signal,
    });
  } catch {
    return proxyError(502, "Gagal menghubungi upstream provider.");
  }

  void recordRequest(apiKeyId);

  if (!upstreamResponse.body) {
    return new Response(null, {
      status: upstreamResponse.status,
      headers: filterHeaders(upstreamResponse.headers),
    });
  }

  let buffered = "";
  const decoder = new TextDecoder();
  const trackingStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffered += decoder.decode(chunk, { stream: true });
      controller.enqueue(chunk);
    },
    flush() {
      const usage = extractTokenUsage(buffered);
      if (usage !== null) {
        void recordTokens(apiKeyId, usage);
      }
      options.onResponseText?.(buffered);
    },
  });

  return new Response(upstreamResponse.body.pipeThrough(trackingStream), {
    status: upstreamResponse.status,
    headers: filterHeaders(upstreamResponse.headers),
  });
}
