import { authenticateRequest, forwardToUpstream, recordCacheHit } from "@/lib/proxy";
import { rewriteModelInBody } from "@/lib/model-catalog";
import { findCachedAnswer, storeAnswer } from "@/lib/semantic-cache";
import { buildCachedMessageResponse, extractAssistantText, extractLastUserText } from "@/lib/anthropic-message-shape";

export const maxDuration = 120;

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

/**
 * Non-streaming POST /v1/messages gets the semantic-cache + model-rewrite
 * treatment; everything else (streaming requests included, to keep this
 * simple) is forwarded untouched — any failure here just falls through to
 * calling the model normally.
 */
async function handleMessages(request: Request, path: string[], apiKeyId: string): Promise<Response> {
  const originalBodyText = await request.text();

  let isStreaming = false;
  try {
    isStreaming = JSON.parse(originalBodyText)?.stream === true;
  } catch {
    // Not valid JSON — just forward as-is below and let upstream reject it.
  }

  if (!isStreaming) {
    const promptText = extractLastUserText(originalBodyText);
    if (promptText) {
      const hit = await findCachedAnswer(promptText);
      if (hit) {
        void recordCacheHit(apiKeyId);
        const model = (() => {
          try {
            return JSON.parse(originalBodyText)?.model ?? "unknown";
          } catch {
            return "unknown";
          }
        })();
        return new Response(buildCachedMessageResponse(hit.answerText, model), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  const { bodyText: rewrittenBodyText } = rewriteModelInBody(originalBodyText);

  return forwardToUpstream(request, path, apiKeyId, {
    bodyTextOverride: rewrittenBodyText,
    onResponseText: isStreaming
      ? undefined
      : (responseText) => {
          const promptText = extractLastUserText(originalBodyText);
          const answerText = extractAssistantText(responseText);
          if (promptText && answerText) {
            storeAnswer(promptText, answerText);
          }
        },
  });
}

async function handle(request: Request, { params }: RouteParams): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { path } = await params;

  if (request.method === "POST" && path.join("/") === "messages") {
    return handleMessages(request, path, auth.key.id);
  }

  return forwardToUpstream(request, path, auth.key.id);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
