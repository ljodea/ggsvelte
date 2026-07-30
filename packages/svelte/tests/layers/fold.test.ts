/**
 * #785: foldPlotLayer is the pure seam that replaces assemble.applyPlotLayer.
 * Operates on AssembleDraft (no fluent builder / TypeBox validate).
 *
 * Browser lane: CI coverage is browser-only (SSR vitest does not collect).
 */
import { describe, expect, it } from "vitest";

import { foldPlotLayer, type AssembleDraft } from "../../src/lib/layers/fold.js";

const rows = [
  { x: 1, y: 2 },
  { x: 3, y: 4 },
];

function base(): AssembleDraft {
  return {
    data: rows,
    aes: { x: "x", y: "y" },
    layers: [{ geom: "point" }],
  };
}

describe("foldPlotLayer", () => {
  it("applies the matching field per kind", () => {
    expect(foldPlotLayer(base(), { kind: "theme", value: "dark" }).theme).toBe("dark");
    expect(foldPlotLayer(base(), { kind: "coord", value: "flip" }).coord).toEqual("flip");
    expect(foldPlotLayer(base(), { kind: "labs", value: { title: "T" } }).labs?.title).toBe("T");
    expect(
      foldPlotLayer(base(), {
        kind: "facet",
        value: { wrap: "g" },
      }).facet,
    ).toBeDefined();
    expect(
      foldPlotLayer(base(), {
        kind: "legend",
        value: { order: "sorted" },
      }).legend,
    ).toBeDefined();
    // scale + guides merge-by-channel/key paths (were browser-uncovered).
    expect(
      foldPlotLayer(base(), {
        kind: "scale",
        value: { x: { type: "continuous" } },
      }).scales?.x,
    ).toEqual({ type: "continuous" });
    expect(
      foldPlotLayer(base(), {
        kind: "guides",
        value: { color: "none" },
      }).guides?.color,
    ).toBe("none");
  });

  it("is a no-op for mark layers", () => {
    const before = base();
    const after = foldPlotLayer(before, {
      kind: "mark",
      descriptor: { geom: "line" },
    });
    expect(after.layers).toEqual(before.layers);
    expect(after.theme).toEqual(before.theme);
  });

  it("is a no-op for host-only legend focus/filter layers", () => {
    // legendFocus / legendFilter never enter PortableSpec — fold must ignore them.
    // `null` value = GuideLegend focus/filter off; kind still must not fold.
    const themed = foldPlotLayer(base(), { kind: "theme", value: "dark" });
    const afterFocus = foldPlotLayer(themed, { kind: "legendFocus", value: null });
    const afterFilter = foldPlotLayer(afterFocus, { kind: "legendFilter", value: null });
    expect(afterFocus).toBe(themed);
    expect(afterFilter).toBe(themed);
    expect(afterFilter.theme).toBe("dark");
    expect(afterFilter.layers).toEqual(themed.layers);
  });

  it("preserves registration order when folding multiple layers", () => {
    // Production assemble folds one layer at a time; same order semantics.
    let draft = base();
    for (const layer of [
      { kind: "theme" as const, value: "light" },
      { kind: "theme" as const, value: "dark" },
      { kind: "labs" as const, value: { title: "first" } },
      { kind: "labs" as const, value: { subtitle: "second" } },
    ]) {
      draft = foldPlotLayer(draft, layer);
    }
    // REPLACE family: last theme wins.
    expect(draft.theme).toBe("dark");
    // MERGE family: later keys win / combine (shallow merge).
    expect(draft.labs?.subtitle).toBe("second");
    expect(draft.labs?.title).toBe("first");
  });

  it("throws TypeError for an unknown kind at runtime", () => {
    expect(() => foldPlotLayer(base(), { kind: "nope", value: {} } as never)).toThrow(
      /Unhandled plot layer kind/,
    );
  });
});
