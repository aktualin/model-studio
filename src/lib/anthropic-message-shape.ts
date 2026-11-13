/**
 * Small, pure helpers for reading/building Anthropic Messages API JSON
 * shapes. Kept dependency-free and side-effect-free so they're easy to
 * unit test in isolation from the proxy/network code.
 */

interface ContentBlock {
  type?: string;
  text?: string;
}

interface AnthropicMessage {
  role?: string;
  content?: string | ContentBlock[];
}

function textFromContent(content: string | ContentBlock[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

/** Extracts the most recent user message's plain text from a request body. */
export function extractLastUserText(requestBodyText: string): string | null {
  try {
    const parsed = JSON.parse(requestBodyText) as { messages?: AnthropicMessage[] };
    const messages = parsed.messages;
    if (!Array.isArray(messages)) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        const text = textFromContent(messages[i].content).trim();
        return text || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Extracts the assistant's plain text from a non-streaming response body. */
export function extractAssistantText(responseBodyText: string): string | null {
  try {
    const parsed = JSON.parse(responseBodyText) as { content?: ContentBlock[] };
    const text = textFromContent(parsed.content).trim();
    return text || null;
  } catch {
    return null;
  }
}

/** Builds a synthetic, non-streaming Messages API response for a cache hit. */
export function buildCachedMessageResponse(answerText: string, model: string): string {
  return JSON.stringify({
    id: `msg_cache_${Date.now().toString(36)}`,
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: answerText }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  });
}
