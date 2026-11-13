import { authenticateRequest } from "@/lib/proxy";
import { CLAUDE_MODEL_CATALOG } from "@/lib/model-catalog";

const LISTED_AT = new Date("2026-01-01T00:00:00Z").toISOString();

/**
 * Mirrors Anthropic's GET /v1/models shape so any client that already lists
 * models against the real API works unmodified — but every id here actually
 * resolves to the same upstream model (see UPSTREAM_MODEL_OVERRIDE / proxy).
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const data = CLAUDE_MODEL_CATALOG.map((model) => ({
    type: "model" as const,
    id: model.id,
    display_name: model.displayName,
    created_at: LISTED_AT,
  }));

  return Response.json({
    data,
    has_more: false,
    first_id: data[0]?.id ?? null,
    last_id: data[data.length - 1]?.id ?? null,
  });
}
