import { describe, expect, it } from "bun:test";

import { compareTokens } from "../../src/candidate-axis-token.ts";
import { canonicalAxisToken } from "../../src/candidate-store.ts";

describe("canonicalAxisToken", () => {
  it("normalizes supported values and excludes invalid buckets", () => {
    expect(canonicalAxisToken(new Date(12))).toEqual({ kind: "number", value: 12 });
    expect(canonicalAxisToken(-0)).toEqual({ kind: "number", value: 0 });
    expect(canonicalAxisToken("a")).toEqual({ kind: "string", value: "a" });
    expect(canonicalAxisToken(false)).toEqual({ kind: "boolean", value: false });
    expect(canonicalAxisToken(null)).toBeNull();
    expect(canonicalAxisToken(Number.NaN)).toBeNull();
    expect(canonicalAxisToken(Infinity)).toBeNull();
  });
});

describe("compareTokens", () => {
  const num = (value: number) => ({ kind: "number", value }) as const;
  const str = (value: string) => ({ kind: "string", value }) as const;
  const bool = (value: boolean) => ({ kind: "boolean", value }) as const;

  it("orders kinds number < string < boolean, then by value within a kind", () => {
    expect(compareTokens(num(9), str("a"))).toBeLessThan(0);
    expect(compareTokens(str("z"), bool(false))).toBeLessThan(0);
    expect(compareTokens(bool(true), num(0))).toBeGreaterThan(0);

    expect(compareTokens(num(1), num(2))).toBeLessThan(0);
    expect(compareTokens(str("b"), str("a"))).toBeGreaterThan(0);
    expect(compareTokens(bool(false), bool(true))).toBeLessThan(0);

    expect(compareTokens(num(3), num(3))).toBe(0);
    expect(compareTokens(str("a"), str("a"))).toBe(0);
    expect(compareTokens(bool(true), bool(true))).toBe(0);
  });
});
