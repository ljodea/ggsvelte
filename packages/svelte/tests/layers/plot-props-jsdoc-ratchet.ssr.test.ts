/**
 * #704: the seven grammar props are gone from plot-props.ts.
 * GRAMMAR_FAMILIES still names them for codemod / docs anchors only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { GRAMMAR_FAMILIES, GGPLOT_PROP_ORDER } from "../../src/lib/layers/grammar-families.js";

const plotPropsPath = join(import.meta.dirname, "../../src/lib/plot-props.ts");

describe("plot-props no longer declares grammar props (#704)", () => {
  const source = readFileSync(plotPropsPath, "utf8");

  for (const kind of GGPLOT_PROP_ORDER) {
    const family = GRAMMAR_FAMILIES[kind];
    it(`${family.propName} is absent from GGPlotProps`, () => {
      expect(source).not.toMatch(new RegExp(`\\b${family.propName}\\?:`));
    });
  }

  it("documents that grammar is children-only", () => {
    expect(source).toMatch(/children-only|#704|declaration-only children/i);
  });
});
