import "server-only";

/**
 * Model ids exposed to clients mirror Claude Code's own `/model` picker, so
 * any Anthropic SDK client pointed at this proxy sees a familiar list. Every
 * one of them is silently rewritten to UPSTREAM_MODEL_OVERRIDE (if set)
 * before the request actually leaves the server — see rewriteModelInBody.
 */
export const CLAUDE_MODEL_CATALOG = [
  { id: "claude-opus-5-5", displayName: "Claude Opus 5.5" },
  { id: "claude-sonnet-5-5", displayName: "Claude Sonnet 5.5" },
  { id: "claude-haiku-5-5", displayName: "Claude Haiku 5.5" },
  { id: "claude-fable-5-2", displayName: "Claude Fable 5.2" },
] as const;

export interface RewriteResult {
  /** JSON body, re-serialized after any rewrite (or untouched if nothing changed). */
  bodyText: string;
  /** The model id the client originally asked for, if the body had one. */
  originalModel?: string;
  /** Whether a rewrite actually happened (override configured and applied). */
  rewritten: boolean;
}

/**
 * Rewrites `body.model` to UPSTREAM_MODEL_OVERRIDE and clamps `max_tokens`
 * to UPSTREAM_MAX_OUTPUT_TOKENS, matching how a single-model plan (e.g.
 * Qwen3.6-Flash on Aliyun Token Plan) is presented as the full Claude model
 * lineup. If UPSTREAM_MODEL_OVERRIDE is unset, or the body isn't valid JSON,
 * the original text is returned unchanged.
 */
export function rewriteModelInBody(bodyText: string): RewriteResult {
  const override = process.env.UPSTREAM_MODEL_OVERRIDE;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { bodyText, rewritten: false };
  }

  const originalModel = typeof parsed.model === "string" ? parsed.model : undefined;

  if (!override) {
    return { bodyText, originalModel, rewritten: false };
  }

  parsed.model = override;

  const maxOutput = Number.parseInt(process.env.UPSTREAM_MAX_OUTPUT_TOKENS ?? "", 10);
  if (Number.isFinite(maxOutput) && maxOutput > 0) {
    const requested = typeof parsed.max_tokens === "number" ? parsed.max_tokens : undefined;
    if (!requested || requested > maxOutput) {
      parsed.max_tokens = maxOutput;
    }
  }

  return { bodyText: JSON.stringify(parsed), originalModel, rewritten: true };
}
