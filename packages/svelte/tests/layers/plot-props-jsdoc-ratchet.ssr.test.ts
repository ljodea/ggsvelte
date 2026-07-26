/**
 * #785: plot-props.ts JSDoc stays (deprecation-wiring requires since + URL)
 * but must match GRAMMAR_FAMILIES metadata (guard, not deletion).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { GRAMMAR_FAMILIES, GGPLOT_PROP_ORDER } from "../../src/lib/layers/grammar-families.js";

const plotPropsPath = join(import.meta.dirname, "../../src/lib/plot-props.ts");

describe("plot-props JSDoc matches GRAMMAR_FAMILIES", () => {
  const source = readFileSync(plotPropsPath, "utf8");

  for (const kind of GGPLOT_PROP_ORDER) {
    const family = GRAMMAR_FAMILIES[kind];
    it(`${family.propName} JSDoc carries since, removeIn, and doc anchor from the table`, () => {
      // Find the prop declaration and walk back to its nearest preceding
      // @deprecated block (props are documented immediately above).
      const propDecl = new RegExp(`\\b${family.propName}\\?:`);
      const propIndex = source.search(propDecl);
      expect(propIndex, `${family.propName} prop missing`).toBeGreaterThan(-1);
      const before = source.slice(0, propIndex);
      const blockStart = before.lastIndexOf("/**");
      expect(blockStart, `${family.propName}: missing JSDoc`).toBeGreaterThan(-1);
      const block = before.slice(blockStart);
      expect(block).toMatch(/@deprecated/);
      expect(block).toContain(`since ${family.since}`);
      expect(block).toContain(family.removeIn);
      expect(block).toContain(`#${family.docAnchor}`);
    });
  }
});
