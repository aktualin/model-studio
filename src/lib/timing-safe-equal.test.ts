import { describe, expect, it } from "vitest";
import { timingSafeEqualStrings } from "./timing-safe-equal";

describe("timingSafeEqualStrings", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualStrings("hunter2", "hunter2")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqualStrings("hunter2", "hunter3")).toBe(false);
  });

  it("returns false for different-length strings", () => {
    expect(timingSafeEqualStrings("short", "a much longer string")).toBe(false);
  });

  it("treats empty strings as equal to each other only", () => {
    expect(timingSafeEqualStrings("", "")).toBe(true);
    expect(timingSafeEqualStrings("", "x")).toBe(false);
  });
});
