/**
 * Tier-1 validation: the agent error contract. Messages are snapshot-tested —
 * they are part of the product surface (agents parse and act on them).
 */
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

function errorsOf(input: unknown) {
  const result = validate(input);
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

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

  it("multiple errors are all reported", () => {
    const errors = errorsOf({
      aes: { x: "displ" },
      layers: [{ geom: "poit" }, { geom: "line", params: { curve: "zig", linewidth: -1 } }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors).toMatchSnapshot();
  });
});
