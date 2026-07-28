/**
 * Tier-2 structural grammar checks (data-free): required channels, rule forms,
 * bar/histogram computed-y bans. Production: validate-structure-layers.ts
 * (barrel validate-structure.ts).
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

  // #1078: REQUIRED_CHANNELS drifted — six geoms were unlisted and required nothing.
  it("label requires x, y, and label (same contract as text)", () => {
    const spec = {
      aes: { x: { field: "city" }, y: { field: "temp" } },
      layers: [{ geom: "label" }],
    };
    const errors = errorsOf(spec);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("missing-required-channel");
    expect(errors[0]?.path).toBe("/layers/0/aes/label");
  });

  it("hex and bin_2d require continuous x and y", () => {
    expect(codesOf({ layers: [{ geom: "hex" }] })).toEqual([
      "missing-required-channel",
      "missing-required-channel",
    ]);
    expect(codesOf({ layers: [{ geom: "bin_2d" }] })).toEqual([
      "missing-required-channel",
      "missing-required-channel",
    ]);
    // x/y present → tier-2 accepts (no data profile needed for channel presence)
    expect(
      validate(
        {
          aes: { x: { field: "a" }, y: { field: "b" } },
          layers: [{ geom: "hex" }, { geom: "bin_2d" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("qq and qq_line require the sample channel", () => {
    const qq = errorsOf({ layers: [{ geom: "qq" }] });
    expect(
      qq.some((e) => e.code === "missing-required-channel" && e.path === "/layers/0/aes/sample"),
    ).toBe(true);
    const line = errorsOf({ layers: [{ geom: "qq_line" }] });
    expect(
      line.some((e) => e.code === "missing-required-channel" && e.path === "/layers/0/aes/sample"),
    ).toBe(true);
    expect(
      validate(
        {
          aes: { sample: { field: "value" } },
          layers: [{ geom: "qq" }, { geom: "qq_line" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("abline is annotation-only: no required aes channels", () => {
    // Listed in REQUIRED_CHANNELS as [] so the table is total over GeomName;
    // params carry slope/intercept (not aes). Missing params is not a channel error.
    const withParams = validate(
      { layers: [{ geom: "abline", params: { slope: 1, intercept: 0 } }] },
      {},
    );
    expect(withParams.ok).toBe(true);
    const bare = validate({ layers: [{ geom: "abline" }] }, {});
    expect(bare.ok).toBe(true);
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

  it("rule: annotation form ignores an INHERITED plot style aes for the geom-capability check", () => {
    // A plot-level size/shape mapping meant for a sibling point layer must not
    // trip unsupported-geom-aesthetic on a fixed-intercept rule that inherits
    // nothing (normalize drops plot aes for annotation rules).
    const result = validate(
      {
        aes: { x: { field: "temp" }, y: { field: "temp" }, size: { field: "pop" } },
        layers: [{ geom: "point" }, { geom: "rule", params: { yintercept: 0 } }],
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
