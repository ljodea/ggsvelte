/**
 * #704: single removal clock for the seven grammar props deprecated in 0.11.0.
 * After 0.13.0 they are gone from GGPlot types, runtime wiring, and exports.
 *
 * Seams: plot-props source, PlotEngineInputs, LayerDescriptor public export.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { GRAMMAR_PROP_NAMES } from "../../src/lib/layers/grammar-families.js";

const root = join(import.meta.dirname, "../../src/lib");

describe("#704 grammar prop removal", () => {
  it("GGPlotProps no longer declares the seven deprecated grammar props", () => {
    const source = readFileSync(join(root, "plot-props.ts"), "utf8");
    for (const prop of GRAMMAR_PROP_NAMES) {
      expect(source, `${prop} still on GGPlotProps`).not.toMatch(new RegExp(`\\b${prop}\\?:`));
    }
  });

  it("PlotEngineInputs no longer reads the seven deprecated grammar props", () => {
    const source = readFileSync(join(root, "plot-engine.svelte.ts"), "utf8");
    // The Inputs type block ends before createPlotEngine; props must not appear as thunk fields.
    const inputsBlock = source.slice(
      source.indexOf("export type PlotEngineInputs"),
      source.indexOf("export type PlotEngine"),
    );
    for (const prop of GRAMMAR_PROP_NAMES) {
      expect(inputsBlock, `${prop} still on PlotEngineInputs`).not.toMatch(
        new RegExp(`\\b${prop}:`),
      );
    }
  });

  it("engine no longer emits DEPRECATED_PLOT_PROP for grammar props", () => {
    const source = readFileSync(join(root, "plot-engine.svelte.ts"), "utf8");
    expect(source).not.toContain("grammarDeprecationInputs");
    expect(source).not.toContain("deprecationDiagnostics");
  });

  it("LayerDescriptor alias is removed (use MarkLayerDescriptor)", () => {
    const registry = readFileSync(join(root, "geoms/registry.svelte.ts"), "utf8");
    const index = readFileSync(join(root, "index.ts"), "utf8");
    expect(registry).not.toMatch(/\bexport type LayerDescriptor\b/);
    expect(index).not.toMatch(/\bLayerDescriptor\b/);
  });
});
