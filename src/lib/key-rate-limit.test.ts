import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRequestRate, checkTokenBudget, recordTokenUsage } from "./key-rate-limit";

describe("checkRequestRate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within a 1s window, then blocks", () => {
    const keyId = `rps-${Math.random()}`;

    expect(checkRequestRate(keyId, 3).allowed).toBe(true);
    expect(checkRequestRate(keyId, 3).allowed).toBe(true);
    expect(checkRequestRate(keyId, 3).allowed).toBe(true);

    const fourth = checkRequestRate(keyId, 3);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets once the window passes", () => {
    const keyId = `rps-reset-${Math.random()}`;

    checkRequestRate(keyId, 1);
    expect(checkRequestRate(keyId, 1).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(checkRequestRate(keyId, 1).allowed).toBe(true);
  });
});

describe("checkTokenBudget / recordTokenUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays allowed until recorded usage meets the budget", () => {
    const keyId = `tpm-${Math.random()}`;

    expect(checkTokenBudget(keyId, 100).allowed).toBe(true);
    recordTokenUsage(keyId, 100);
    expect(checkTokenBudget(keyId, 100).allowed).toBe(false);
  });

  it("resets the budget after the 60s window", () => {
    const keyId = `tpm-reset-${Math.random()}`;

    recordTokenUsage(keyId, 50);
    expect(checkTokenBudget(keyId, 50).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkTokenBudget(keyId, 50).allowed).toBe(true);
  });

  it("ignores non-positive token amounts", () => {
    const keyId = `tpm-noop-${Math.random()}`;

    recordTokenUsage(keyId, 0);
    recordTokenUsage(keyId, -5);
    expect(checkTokenBudget(keyId, 1).allowed).toBe(true);
  });
});
