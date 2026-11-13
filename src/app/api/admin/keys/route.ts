import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-keys";
import type {
  ApiKeySummaryDTO,
  CreateApiKeyRequestBody,
  CreateApiKeyResponseBody,
} from "@/types/api-key";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  requestsPerSecond: number;
  tokensPerMinute: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  requestCount: bigint;
  tokenCount: bigint;
  createdAt: Date;
}

function toSummary(key: ApiKeyRecord): ApiKeySummaryDTO {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    requestsPerSecond: key.requestsPerSecond,
    tokensPerMinute: key.tokensPerMinute,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    requestCount: key.requestCount.toString(),
    tokenCount: key.tokenCount.toString(),
    createdAt: key.createdAt.toISOString(),
  };
}

function normalizePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
}

export async function GET() {
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  const body: ApiKeySummaryDTO[] = keys.map(toSummary);
  return Response.json(body);
}

export async function POST(request: Request) {
  let body: CreateApiKeyRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body request tidak valid." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "Nama API key tidak boleh kosong." }, { status: 400 });
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return Response.json({ error: "Tanggal kedaluwarsa tidak valid." }, { status: 400 });
    }
    expiresAt = parsed;
  }

  const requestsPerSecond = normalizePositiveInt(body.requestsPerSecond, 5);
  const tokensPerMinute = normalizePositiveInt(body.tokensPerMinute, 100_000);

  const { secret, keyPrefix, hashedKey } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      name,
      keyPrefix,
      hashedKey,
      requestsPerSecond,
      tokensPerMinute,
      expiresAt,
    },
  });

  const responseBody: CreateApiKeyResponseBody = { ...toSummary(created), secret };
  return Response.json(responseBody, { status: 201 });
}
