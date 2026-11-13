export interface ApiKeySummaryDTO {
  id: string;
  name: string;
  keyPrefix: string;
  requestsPerSecond: number;
  tokensPerMinute: number;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  requestCount: string;
  tokenCount: string;
  createdAt: string;
}

export interface CreateApiKeyRequestBody {
  name: string;
  requestsPerSecond?: number;
  tokensPerMinute?: number;
  /** ISO date string, or omitted/null for "never expires". */
  expiresAt?: string | null;
}

export interface CreateApiKeyResponseBody extends ApiKeySummaryDTO {
  /** The full secret. Only ever returned once, at creation time. */
  secret: string;
}

export interface ApiErrorBody {
  error: string;
}
