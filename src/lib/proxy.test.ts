import { afterEach, describe, expect, it } from "vitest";
import { getUpstreamTarget } from "./proxy";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getUpstreamTarget", () => {
  it("defaults to the real Anthropic API with an x-api-key header", () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    delete process.env.ANTHROPIC_BASE_URL;

    const target = getUpstreamTarget();

    expect(target.baseUrl).toBe("https://api.anthropic.com/v1");
    expect(target.authHeaderName).toBe("x-api-key");
    expect(target.authHeaderValue).toBe("sk-ant-test");
    expect(target.extraHeaders).toMatchObject({ "anthropic-version": expect.any(String) });
  });

  it("honors ANTHROPIC_BASE_URL (e.g. an Aliyun Token Plan host)", () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-sp-test";
    process.env.ANTHROPIC_BASE_URL = "https://token-plan.example.com/apps/anthropic/";

    const target = getUpstreamTarget();

    expect(target.baseUrl).toBe("https://token-plan.example.com/apps/anthropic/v1");
  });

  it("throws when ANTHROPIC_API_KEY is missing", () => {
    process.env.AI_PROVIDER = "anthropic";
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => getUpstreamTarget()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("routes to OpenAI with a Bearer authorization header", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-openai-test";
    delete process.env.OPENAI_BASE_URL;

    const target = getUpstreamTarget();

    expect(target.baseUrl).toBe("https://api.openai.com/v1");
    expect(target.authHeaderName).toBe("authorization");
    expect(target.authHeaderValue).toBe("Bearer sk-openai-test");
  });

  it("honors OPENAI_BASE_URL overrides", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-openai-test";
    process.env.OPENAI_BASE_URL = "https://my-openai-proxy.example.com";

    const target = getUpstreamTarget();

    expect(target.baseUrl).toBe("https://my-openai-proxy.example.com/v1");
  });

  it("throws when OPENAI_API_KEY is missing", () => {
    process.env.AI_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;

    expect(() => getUpstreamTarget()).toThrow(/OPENAI_API_KEY/);
  });

  it("uses MODEL_STUDIO_BASE_URL as-is, without appending /v1", () => {
    process.env.AI_PROVIDER = "modelstudio";
    process.env.MODEL_STUDIO_API_KEY = "sk-ms-test";
    process.env.MODEL_STUDIO_BASE_URL = "https://dashscope.example.com/compatible-mode/v1";

    const target = getUpstreamTarget();

    expect(target.baseUrl).toBe("https://dashscope.example.com/compatible-mode/v1");
    expect(target.authHeaderValue).toBe("Bearer sk-ms-test");
  });

  it("throws when modelstudio config is incomplete", () => {
    process.env.AI_PROVIDER = "modelstudio";
    delete process.env.MODEL_STUDIO_API_KEY;
    delete process.env.MODEL_STUDIO_BASE_URL;

    expect(() => getUpstreamTarget()).toThrow(/MODEL_STUDIO/);
  });
});
