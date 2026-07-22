/**
 * Tier-1 validation: the agent error contract. Messages are snapshot-tested —
 * they are part of the product surface (agents parse and act on them).
 *
 * TypeBox 1.x mapping regressions live in validate-map-errors.test.ts next to
 * the mapper module under test.
 */
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

function errorsOf(input: unknown) {
  const result = validate(input);
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

describe("validate — performance", () => {
  it("validates a 10,000-row inline dataset without blocking interactive rendering", () => {
    const values = Array.from({ length: 10_000 }, (_, index) => ({
      x: index,
      y: index % 100,
    }));
    const startedAt = performance.now();

    const result = validate({
      data: { values },
      aes: { x: { field: "x" }, y: { field: "y" } },
      layers: [{ geom: "point" }],
    });

    expect(result.ok).toBe(true);
    expect(performance.now() - startedAt).toBeLessThan(2_000);
  });
});

describe("validate — accepts", () => {
  it("a minimal valid spec", () => {
    const result = validate({ layers: [{ geom: "point" }] });
    expect(result.ok).toBe(true);
  });

  it("accepts the hrbrthemes and ggthemes categorical schemes", () => {
    for (const scheme of ["ipsum", "flexoki", "tableau10", "colorblind"]) {
      const result = validate({
        layers: [{ geom: "point" }],
        scales: { color: { type: "ordinal", scheme } },
      });
      expect(result.ok).toBe(true);
    }
  });

  it("accepts interaction theme role overrides", () => {
    const result = validate({
      layers: [{ geom: "point" }],
      theme: {
        interactionInk: "#102030",
        interactionMuted: 0.42,
        focusRing: "#204060",
        crosshair: "#305070",
        selectionFill: "rgba(32, 64, 96, 0.18)",
        selectionStroke: "#204060",
        tooltipPaper: "#ffffff",
        tooltipInk: "#102030",
        tooltipBorder: "#d0d7de",
        toolActive: "#102030",
      },
    });
    expect(result.ok).toBe(true);
  });

  it("a full spec with all channel forms", () => {
    const result = validate({
      $schema: "https://example.invalid/v0.json",
      data: { values: [{ x: 1, y: 2, cls: "a" }] },
      datasets: { other: { columns: { x: [1, null], y: [2, 3] } } },
      aes: { x: { field: "x" }, y: { field: "y" } },
      layers: [
        {
          geom: "point",
          stat: "identity",
          position: "identity",
          aes: {
            color: { value: "steelblue" },
            size: { value: 3, scale: true },
            label: null,
            group: { stat: "count" },
          },
          params: { alpha: 0.5, size: 2, shape: "square" },
        },
        { geom: "line", params: { linewidth: 1, curve: "step" } },
      ],
      labs: { title: "T", x: "X" },
      theme: "default",
      width: 640,
      height: 400,
    });
    expect(result.ok).toBe(true);
  });
});

describe("validate — agent errors (snapshot-tested messages)", () => {
  it("non-object root", () => {
    expect(errorsOf("nope")).toMatchSnapshot();
  });

  it("missing layers", () => {
    expect(errorsOf({})).toMatchSnapshot();
  });

  it("empty layers", () => {
    expect(errorsOf({ layers: [] })).toMatchSnapshot();
  });

  it("unknown geom with did-you-mean", () => {
    expect(errorsOf({ layers: [{ geom: "poit" }] })).toMatchSnapshot();
  });

  it("geom missing entirely", () => {
    expect(errorsOf({ layers: [{}] })).toMatchSnapshot();
  });

  it("bare-string channel gets the canonical-form fix", () => {
    expect(errorsOf({ aes: { x: "displ" }, layers: [{ geom: "point" }] })).toMatchSnapshot();
  });

  it("wrong-geom params (line params on point) name the unknown property", () => {
    expect(errorsOf({ layers: [{ geom: "point", params: { linewidth: 2 } }] })).toMatchSnapshot();
  });

  it("typo'd param with did-you-mean", () => {
    expect(errorsOf({ layers: [{ geom: "point", params: { alpa: 0.5 } }] })).toMatchSnapshot();
  });

  it("param out of range", () => {
    expect(errorsOf({ layers: [{ geom: "point", params: { alpha: 5 } }] })).toMatchSnapshot();
  });

  it("bad enum value with did-you-mean", () => {
    expect(errorsOf({ layers: [{ geom: "line", params: { curve: "stepp" } }] })).toMatchSnapshot();
  });

  it("invalid data ref", () => {
    expect(errorsOf({ data: { rows: [] }, layers: [{ geom: "point" }] })).toMatchSnapshot();
  });

  it("unexpected top-level property with did-you-mean", () => {
    expect(errorsOf({ layer: [], layers: [{ geom: "point" }] })).toMatchSnapshot();
  });

  it("rejects a categorical scheme on a sequential scale with a named fix", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      scales: { color: { type: "sequential", scheme: "ipsum" } },
    });

    expect(errors).toEqual([
      {
        code: "scale-scheme-type",
        path: "/scales/color/scheme",
        message: 'The categorical scheme "ipsum" cannot be used with a sequential color scale.',
        fix: {
          description: 'Use "viridis" or provide a sequential range of #rgb/#rrggbb stops.',
          example: "viridis",
        },
      },
    ]);
  });

  it("rejects the sequential scheme on an ordinal scale with a named fix", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      scales: { fill: { type: "ordinal", scheme: "viridis" } },
    });

    expect(errors).toEqual([
      {
        code: "scale-scheme-type",
        path: "/scales/fill/scheme",
        message: 'The sequential scheme "viridis" cannot be used with an ordinal color scale.',
        fix: {
          description: "Use a categorical scheme or provide an ordinal range of CSS colors.",
          example: "observable10",
        },
      },
    ]);
  });

  it("rejects non-hex custom color stops before rendering", () => {
    for (const unsupported of ["red", "rgb(255 0 0)"]) {
      const errors = errorsOf({
        layers: [{ geom: "point" }],
        scales: { color: { type: "sequential", range: ["#000", unsupported] } },
      });

      expect(errors).toEqual([
        {
          code: "scale-range-color",
          path: "/scales/color/range/1",
          message: `The color stop "${unsupported}" is not a supported hex color.`,
          fix: {
            description: "Use #rgb or #rrggbb syntax for custom color ranges.",
            example: "#ff0000",
          },
        },
      ]);
    }
  });

  it("multiple errors are all reported", () => {
    const errors = errorsOf({
      aes: { x: "displ" },
      layers: [{ geom: "poit" }, { geom: "line", params: { curve: "zig", linewidth: -1 } }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors).toMatchSnapshot();
  });
});
