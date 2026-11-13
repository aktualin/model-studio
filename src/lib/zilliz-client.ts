import "server-only";
import { EMBEDDING_DIM } from "@/lib/local-embedding";

const VECTOR_FIELD = "vector";
const TEXT_FIELD = "prompt_text";
const ANSWER_FIELD = "answer_text";

interface ZilligConfig {
  endpoint: string;
  token: string;
  collection: string;
}

function getConfig(): ZilligConfig | null {
  const endpoint = process.env.ZILLIZ_ENDPOINT;
  const token = process.env.ZILLIZ_TOKEN;
  const collection = process.env.ZILLIZ_COLLECTION || "model_studio_semantic_cache_v1";
  if (!endpoint || !token) return null;
  return { endpoint: endpoint.replace(/\/+$/, ""), token, collection };
}

async function call<T>(config: ZilligConfig, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.endpoint}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || json.code !== 0) {
    throw new Error(`Zilliz request to ${path} failed: ${JSON.stringify(json)}`);
  }
  return json.data as T;
}

// Collection creation is attempted at most once per server process; this
// cluster is shared with other people, so the name is namespaced via
// ZILLIZ_COLLECTION and we only ever create/read/write that one collection.
let ensurePromise: Promise<void> | null = null;

async function ensureCollection(config: ZilligConfig): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = call(config, "/v2/vectordb/collections/create", {
      collectionName: config.collection,
      schema: {
        autoID: true,
        enableDynamicField: false,
        fields: [
          { fieldName: "id", dataType: "Int64", isPrimary: true },
          { fieldName: VECTOR_FIELD, dataType: "FloatVector", elementTypeParams: { dim: EMBEDDING_DIM } },
          { fieldName: TEXT_FIELD, dataType: "VarChar", elementTypeParams: { max_length: 8192 }, defaultValue: "" },
          { fieldName: ANSWER_FIELD, dataType: "VarChar", elementTypeParams: { max_length: 65535 }, defaultValue: "" },
        ],
      },
      indexParams: [
        { fieldName: VECTOR_FIELD, indexName: VECTOR_FIELD, metricType: "COSINE", params: { index_type: "AUTOINDEX" } },
      ],
    }).then(
      () => undefined,
      (error) => {
        // "already exists" on a shared cluster is the expected steady state —
        // swallow it; any other error just disables caching for this call.
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("already exist") && !message.includes("exists")) {
          throw error;
        }
      },
    );
  }
  return ensurePromise;
}

export interface CacheEntry {
  promptText: string;
  answerText: string;
  distance: number;
}

export async function searchSimilar(vector: number[], limit = 1): Promise<CacheEntry[]> {
  const config = getConfig();
  if (!config) return [];

  await ensureCollection(config);
  const results = await call<Array<Record<string, unknown>>>(config, "/v2/vectordb/entities/search", {
    collectionName: config.collection,
    data: [vector],
    annsField: VECTOR_FIELD,
    limit,
    outputFields: [TEXT_FIELD, ANSWER_FIELD],
    searchParams: { metricType: "COSINE", params: {} },
  });

  return results.map((row) => ({
    promptText: String(row[TEXT_FIELD] ?? ""),
    answerText: String(row[ANSWER_FIELD] ?? ""),
    distance: Number(row.distance ?? 0),
  }));
}

export async function insertEntry(vector: number[], promptText: string, answerText: string): Promise<void> {
  const config = getConfig();
  if (!config) return;

  await ensureCollection(config);
  await call(config, "/v2/vectordb/entities/insert", {
    collectionName: config.collection,
    data: [{ [VECTOR_FIELD]: vector, [TEXT_FIELD]: promptText.slice(0, 8192), [ANSWER_FIELD]: answerText.slice(0, 65535) }],
  });
}

export function isSemanticCacheConfigured(): boolean {
  return getConfig() !== null;
}
