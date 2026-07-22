import { describe, expect, it } from "bun:test";

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
