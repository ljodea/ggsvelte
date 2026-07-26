/**
 * #785: foldPlotLayer is the pure seam that replaces assemble.applyPlotLayer.
 */
import { gg } from "@ggsvelte/spec";
import { describe, expect, it } from "vitest";

import { foldPlotLayer, foldPlotLayers } from "../../src/lib/layers/fold.js";

const rows = [
  { x: 1, y: 2 },
  { x: 3, y: 4 },
];

function base() {
  return gg(rows, { x: "x", y: "y" }).layer({ geom: "point" });
}

describe("foldPlotLayer", () => {
  it("applies the matching builder method per kind", () => {
    expect(foldPlotLayer(base(), { kind: "theme", value: "dark" }).spec().theme).toBe("dark");
    expect(foldPlotLayer(base(), { kind: "coord", value: "flip" }).spec().coord).toEqual({
      type: "flip",
    });
    expect(foldPlotLayer(base(), { kind: "labs", value: { title: "T" } }).spec().labs?.title).toBe(
      "T",
    );
    expect(
      foldPlotLayer(base(), {
        kind: "facet",
        value: { wrap: "g" },
      }).spec().facet,
    ).toBeDefined();
    expect(
      foldPlotLayer(base(), {
        kind: "legend",
        value: { order: "sorted" },
      }).spec().legend,
    ).toBeDefined();
  });

  it("is a no-op for mark layers", () => {
    const before = base().spec();
    const after = foldPlotLayer(base(), {
      kind: "mark",
      descriptor: { geom: "line" },
    }).spec();
    expect(after.layers).toEqual(before.layers);
    expect(after.theme).toEqual(before.theme);
  });

  it("preserves array order when folding multiple layers", () => {
    const spec = foldPlotLayers(base(), [
      { kind: "theme", value: "light" },
      { kind: "theme", value: "dark" },
      { kind: "labs", value: { title: "first" } },
      { kind: "labs", value: { subtitle: "second" } },
    ]).spec();
    // REPLACE family: last theme wins.
    expect(spec.theme).toBe("dark");
    // MERGE family: later keys win / combine (builder shallow merge).
    expect(spec.labs?.subtitle).toBe("second");
  });

  it("throws TypeError for an unknown kind at runtime", () => {
    expect(() => foldPlotLayer(base(), { kind: "nope", value: {} } as never)).toThrow(
      /Unhandled plot layer kind/,
    );
  });
});
