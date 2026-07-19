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

  it("multiple errors are all reported", () => {
    const errors = errorsOf({
      aes: { x: "displ" },
      layers: [{ geom: "poit" }, { geom: "line", params: { curve: "zig", linewidth: -1 } }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors).toMatchSnapshot();
  });
});

describe("validate — TypeBox 1.x error mapping (Codex P2 regressions)", () => {
  it("nested channel constant type stays a value error, not invalid-channel-value", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { value: {} } } }],
    });
    expect(errors.some((e) => e.code === "invalid-channel-value")).toBe(false);
    expect(errors.some((e) => e.path === "/layers/0/aes/x/value")).toBe(true);
    expect(errors.find((e) => e.path === "/layers/0/aes/x/value")?.code).toBe("invalid-type");
  });

  it("bad inline data cell is not invalid-data re-wrap or unexpected-property", () => {
    const errors = errorsOf({
      data: { values: [{ x: {} }] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-data")).toBe(false);
    expect(errors.some((e) => e.code === "unexpected-property" && e.path.includes("/x"))).toBe(
      false,
    );
    expect(errors.some((e) => e.path === "/data/values/0/x" && e.code === "invalid-type")).toBe(
      true,
    );
  });

  it("theme object with extra key reports unexpected-property, not theme-name enum", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      theme: { name: "dark", accent: "#f00", extra: true },
    });
    expect(errors.some((e) => e.code === "invalid-enum-value")).toBe(false);
    expect(errors.some((e) => e.code === "unexpected-property" && e.path === "/theme/extra")).toBe(
      true,
    );
  });

  it("invalid theme string still reports invalid-enum-value with allowed names", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      theme: "not-a-theme",
    });
    expect(errors.some((e) => e.code === "invalid-enum-value" && e.path === "/theme")).toBe(true);
    expect(errors.find((e) => e.path === "/theme")?.allowed?.length).toBeGreaterThan(4);
  });

  it("TypeBox maxErrors is raised so multi-field failures exceed the default 8", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      theme: "nope",
      coord: { type: "nope" },
      labs: {
        title: 1,
        subtitle: 2,
        x: 3,
        y: 4,
        color: 5,
        fill: 6,
        caption: 7,
      },
    });
    // Default TypeBox maxErrors is 8; with Settings raised we keep more mapped diagnostics.
    expect(errors.length).toBeGreaterThan(8);
    expect(errors.some((e) => e.path === "/labs/caption")).toBe(true);
  });

  it("near-canonical channel with a typo key reports unexpected-property", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { field: "x", fielld: true } } }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some((e) => e.code === "unexpected-property" && e.path === "/layers/0/aes/x/fielld"),
    ).toBe(true);
  });

  it("mixed channel forms (field+value) report invalid-channel-value, not root invalid-type", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { field: "x", value: 1 } } }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some(
        (e) =>
          e.code === "invalid-channel-value" &&
          e.path === "/layers/0/aes/x" &&
          e.message.includes("mixes"),
      ),
    ).toBe(true);
  });

  it("field form with scale (ValueRef-only key) reports unexpected-property", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { field: "x", scale: true } } }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some((e) => e.code === "unexpected-property" && e.path === "/layers/0/aes/x/scale"),
    ).toBe(true);
  });

  it("wrapped data with an extra sibling key reports unexpected-property", () => {
    const errors = errorsOf({
      data: { values: [], rows: [] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(errors.some((e) => e.code === "unexpected-property" && e.path === "/data/rows")).toBe(
      true,
    );
  });

  it("mixed data forms (values+name) report invalid-data, not root invalid-type", () => {
    const errors = errorsOf({
      data: { values: [], name: "cars" },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some(
        (e) => e.code === "invalid-data" && e.path === "/data" && e.message.includes("mixes forms"),
      ),
    ).toBe(true);
  });

  it("mixed data forms (columns+values) report invalid-data mixes forms", () => {
    const errors = errorsOf({
      data: { columns: { x: [1] }, values: [] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(errors.some((e) => e.code === "invalid-data" && e.message.includes("mixes forms"))).toBe(
      true,
    );
  });

  it("explicit undefined on optional props is rejected (exactOptionalPropertyTypes)", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      width: undefined,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.path === "/width" || e.code === "invalid-type")).toBe(true);
  });
});
