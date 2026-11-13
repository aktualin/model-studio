import { afterEach, describe, expect, it } from "vitest";
import { rewriteModelInBody } from "./model-catalog";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("rewriteModelInBody", () => {
  it("leaves the body untouched when no override is configured", () => {
    delete process.env.UPSTREAM_MODEL_OVERRIDE;
    const body = JSON.stringify({ model: "claude-opus-5-5", max_tokens: 1024 });

    const result = rewriteModelInBody(body);

    expect(result.rewritten).toBe(false);
    expect(result.bodyText).toBe(body);
    expect(result.originalModel).toBe("claude-opus-5-5");
  });

  it("rewrites the model id to the configured override", () => {
    process.env.UPSTREAM_MODEL_OVERRIDE = "qwen3.6-flash";
    delete process.env.UPSTREAM_MAX_OUTPUT_TOKENS;
    const body = JSON.stringify({ model: "claude-fable-5-2", messages: [] });

    const result = rewriteModelInBody(body);

    expect(result.rewritten).toBe(true);
    expect(result.originalModel).toBe("claude-fable-5-2");
    expect(JSON.parse(result.bodyText).model).toBe("qwen3.6-flash");
  });

  it("clamps max_tokens down to the configured ceiling", () => {
    process.env.UPSTREAM_MODEL_OVERRIDE = "qwen3.6-flash";
    process.env.UPSTREAM_MAX_OUTPUT_TOKENS = "65536";
    const body = JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 200_000 });

    const result = rewriteModelInBody(body);

    expect(JSON.parse(result.bodyText).max_tokens).toBe(65536);
  });

  it("fills in a default max_tokens when the client omitted it", () => {
    process.env.UPSTREAM_MODEL_OVERRIDE = "qwen3.6-flash";
    process.env.UPSTREAM_MAX_OUTPUT_TOKENS = "65536";
    const body = JSON.stringify({ model: "claude-haiku-5-5" });

    const result = rewriteModelInBody(body);

    expect(JSON.parse(result.bodyText).max_tokens).toBe(65536);
  });

  it("leaves max_tokens alone when it's already within the ceiling", () => {
    process.env.UPSTREAM_MODEL_OVERRIDE = "qwen3.6-flash";
    process.env.UPSTREAM_MAX_OUTPUT_TOKENS = "65536";
    const body = JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 512 });

    const result = rewriteModelInBody(body);

    expect(JSON.parse(result.bodyText).max_tokens).toBe(512);
  });

  it("returns the input unchanged when the body isn't valid JSON", () => {
    process.env.UPSTREAM_MODEL_OVERRIDE = "qwen3.6-flash";
    const result = rewriteModelInBody("not json");

    expect(result.rewritten).toBe(false);
    expect(result.bodyText).toBe("not json");
  });
});
