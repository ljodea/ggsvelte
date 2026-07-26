/**
 * Direct unit tests for definedProps (#786).
 * Previously only exercised implicitly via six family factories.
 */
import { describe, expect, it } from "vitest";

import { definedProps } from "../../src/lib/layers/plot-layer.svelte.js";

describe("definedProps", () => {
  it("strips own keys whose value is undefined", () => {
    expect(definedProps({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, c: "x" });
  });

  it("keeps null, 0, false, and empty string", () => {
    expect(definedProps({ a: null, b: 0, c: false, d: "" })).toEqual({
      a: null,
      b: 0,
      c: false,
      d: "",
    });
  });

  it("returns an empty object for empty input", () => {
    expect(definedProps({})).toEqual({});
  });

  it("does not copy inherited enumerable keys", () => {
    const proto = { inherited: 1 };
    const obj = Object.create(proto) as { own: number; inherited?: number };
    obj.own = 2;
    expect(definedProps(obj)).toEqual({ own: 2 });
    expect(definedProps(obj)).not.toHaveProperty("inherited");
  });

  it("does not mutate the input object", () => {
    const input = { a: 1, b: undefined as number | undefined };
    const out = definedProps(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ a: 1, b: undefined });
    expect(out).toEqual({ a: 1 });
  });
});
