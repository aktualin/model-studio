import { describe, expect, it } from "vitest";
import {
  buildCachedMessageResponse,
  extractAssistantText,
  extractLastUserText,
} from "./anthropic-message-shape";

describe("extractLastUserText", () => {
  it("returns the last user message's string content", () => {
    const body = JSON.stringify({
      messages: [
        { role: "user", content: "first question" },
        { role: "assistant", content: "an answer" },
        { role: "user", content: "second question" },
      ],
    });

    expect(extractLastUserText(body)).toBe("second question");
  });

  it("joins text blocks when content is an array", () => {
    const body = JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "part one" },
            { type: "image", source: {} },
            { type: "text", text: "part two" },
          ],
        },
      ],
    });

    expect(extractLastUserText(body)).toBe("part one\npart two");
  });

  it("returns null when there is no user message", () => {
    const body = JSON.stringify({ messages: [{ role: "assistant", content: "hi" }] });
    expect(extractLastUserText(body)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(extractLastUserText("{not json")).toBeNull();
  });
});

describe("extractAssistantText", () => {
  it("joins text blocks from a non-streaming response", () => {
    const body = JSON.stringify({
      content: [
        { type: "text", text: "Hello" },
        { type: "text", text: "there" },
      ],
    });

    expect(extractAssistantText(body)).toBe("Hello\nthere");
  });

  it("returns null when there's no text content", () => {
    expect(extractAssistantText(JSON.stringify({ content: [] }))).toBeNull();
  });
});

describe("buildCachedMessageResponse", () => {
  it("produces a valid Messages API shape with zero token usage", () => {
    const parsed = JSON.parse(buildCachedMessageResponse("cached answer", "claude-opus-5-5"));

    expect(parsed.role).toBe("assistant");
    expect(parsed.model).toBe("claude-opus-5-5");
    expect(parsed.content).toEqual([{ type: "text", text: "cached answer" }]);
    expect(parsed.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
  });
});
