/**
 * Tier-2 structural grammar checks (data-free): required channels, rule forms,
 * bar/histogram computed-y bans. Production: validate-structure.ts.
 */
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

function errorsOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  const result = validate(input, options ?? {});
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

function codesOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  return errorsOf(input, options).map((e) => e.code);
}

describe("tier 2 — structural grammar checks (opt-in, data-free)", () => {
  it("tier 1 alone accepts a channel-less point layer; tier 2 rejects it", () => {
    const spec = { layers: [{ geom: "point" }] };
    expect(validate(spec).ok).toBe(true);
    expect(codesOf(spec)).toEqual(["missing-required-channel", "missing-required-channel"]);
  });

  it("text requires x, y, and label", () => {
    const spec = {
      aes: { x: { field: "city" }, y: { field: "temp" } },
      layers: [{ geom: "text" }],
    };
    const errors = errorsOf(spec);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("missing-required-channel");
    expect(errors[0]?.path).toBe("/layers/0/aes/label");
  });

  it("bar with mapped y is rejected with a col suggestion", () => {
    const errors = errorsOf({
      aes: { x: { field: "city" }, y: { field: "temp" } },
      layers: [{ geom: "bar" }],
    });
    expect(errors[0]?.code).toBe("computed-y-mapped");
    expect(errors[0]?.fix?.example).toEqual({ geom: "col" });
  });

  it("bar with the count-stat y mapping is fine", () => {
    const result = validate(
      { aes: { x: { field: "city" }, y: { stat: "count" } }, layers: [{ geom: "bar" }] },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("rule: annotation form + a layer-mapped aes.x is ambiguous", () => {
    expect(
      codesOf({
        layers: [{ geom: "rule", aes: { x: { field: "temp" } }, params: { yintercept: 0 } }],
      }),
    ).toEqual(["rule-form-ambiguous"]);
  });

  it("rule: annotation form ignores INHERITED plot aes (inherit.aes = FALSE)", () => {
    const result = validate(
      {
        aes: { x: { field: "temp" }, y: { field: "temp" } },
        layers: [{ geom: "rule", params: { yintercept: 0 } }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("rule: neither form is an error", () => {
    expect(codesOf({ layers: [{ geom: "rule" }] })).toEqual(["rule-form-missing"]);
  });

  it("rule: both axes mapped is an error", () => {
    expect(
      codesOf({
        aes: { x: { field: "temp" }, y: { field: "temp" } },
        layers: [{ geom: "rule" }],
      }),
    ).toEqual(["rule-both-axes"]);
  });

  it("rule: null-unset makes the annotation form valid under a mapped plot aes", () => {
    const result = validate(
      {
        aes: { x: { field: "temp" }, y: { field: "temp" } },
        layers: [{ geom: "rule", aes: { x: null, y: null }, params: { yintercept: 0 } }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });
});
