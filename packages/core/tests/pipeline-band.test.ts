import { describe, expect, it } from "bun:test";

import { runPipeline } from "../src/pipeline.ts";
import type { SpecInput } from "@ggsvelte/spec";

const rows = [
  { category: "Resolución", count: 9000 },
  { category: "Corrección (errores o erratas)", count: 3200 },
  { category: "Sentencia", count: 2800 },
  { category: "Orden", count: 2500 },
  { category: "Otro", count: 900 },
];
const spec: SpecInput = {
  data: { values: rows },
  layers: [{ geom: "col", aes: { x: { field: "category" }, y: { field: "count" } } }],
};

describe("band axis diagnostics (#387)", () => {
  it("emits a rotated advisory that surfaces coord_flip, at a narrow width", () => {
    const model = runPipeline(spec, { width: 240, height: 300 });
    const advisory = model.advisories.find((a) => a.code === "band-labels-rotated");
    expect(advisory).toBeDefined();
    expect(advisory?.path).toBe("/scales/x");
    expect(advisory?.howToOverride).toContain("coordFlip");
  });

  it("emits a band-label-margin-overflow diagnostic with a coord_flip fix", () => {
    const model = runPipeline(spec, { width: 240, height: 300 });
    const diag = model.scaleDiagnostics.find((d) => d.code === "band-label-margin-overflow");
    expect(diag).toBeDefined();
    expect(diag?.path).toBe("/scales/x");
    // The band diagnostic (not temporal text) with a coord_flip fix.
    expect(diag?.problem).toMatch(/categorical/i);
    expect(diag?.fixes.some((f) => f.typescript === ".coordFlip()")).toBe(true);
  });

  it("emits a wrapped advisory (not rotated) at a readable width", () => {
    const model = runPipeline(spec, { width: 560, height: 300 });
    expect(model.advisories.some((a) => a.code === "band-labels-wrapped")).toBe(true);
    expect(model.advisories.some((a) => a.code === "band-labels-rotated")).toBe(false);
  });

  it("plans band labels in faceted charts too (Codex P2)", () => {
    const facetSpec: SpecInput = {
      data: {
        values: rows.flatMap((r) => [
          { ...r, panel: "A" },
          { ...r, panel: "B" },
        ]),
      },
      layers: [{ geom: "col", aes: { x: { field: "category" }, y: { field: "count" } } }],
      facet: { cols: "panel" },
    };
    // Two side-by-side panels at 700px → each panel band is narrow → wrap/rotate.
    const model = runPipeline(facetSpec, { width: 700, height: 300 });
    expect(model.advisories.some((a) => a.code.startsWith("band-labels-"))).toBe(true);
  });

  it("does not degrade a short-label bar chart", () => {
    const shortSpec: SpecInput = {
      data: {
        values: [
          { c: "IT", n: 1 },
          { c: "HR", n: 2 },
          { c: "Ops", n: 3 },
        ],
      },
      layers: [{ geom: "col", aes: { x: { field: "c" }, y: { field: "n" } } }],
    };
    const model = runPipeline(shortSpec, { width: 480, height: 300 });
    expect(model.advisories.some((a) => a.code.startsWith("band-labels-"))).toBe(false);
    expect(model.scaleDiagnostics.some((d) => d.code.startsWith("band-label-"))).toBe(false);
  });
});
