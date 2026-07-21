/**
 * PR 3 — capability-ledger cross-validation.
 *
 * The scale-capability ledger is a checked contract, not a hand-maintained
 * list: this suite proves every claimed helper is a real package-root export,
 * that ggplot2 snake_case aliases are binding-identical to their camelCase
 * source, that each helper normalizes to its declared canonical family, and
 * that the ledger distinguishes canonical families from accepted authoring
 * aliases (`type: "log"`) and pre-stat transform capabilities. The
 * "appears in generated agent docs" arm lives in scripts/gen-llms.test.ts,
 * which can import the generated guide content.
 */
import { describe, expect, it } from "bun:test";

import { SCALE_CAPABILITIES } from "../src/capabilities.ts";
import * as spec from "../src/index.ts";
import { normalize } from "../src/normalize.ts";
import type { Scales } from "../src/schema.ts";

const registry = spec as Record<string, unknown>;
const positionFamilies = SCALE_CAPABILITIES.filter((c) => c.family.startsWith("position-"));

describe("capability ledger shape", () => {
  it("keeps every family's canonical scaleTypes free of authored aliases", () => {
    for (const cap of SCALE_CAPABILITIES) {
      expect(cap.scaleTypes).not.toContain("log");
    }
  });

  it("records type:log as an accepted authored alias of position-continuous", () => {
    const continuous = SCALE_CAPABILITIES.find((c) => c.family === "position-continuous");
    expect(continuous?.authoredAliases).toContain("log");
    expect(continuous?.scaleTypes).toEqual(["linear"]);
  });

  it("records identity/log10/sqrt transforms for the continuous and binned families", () => {
    for (const family of ["position-continuous", "position-binned"] as const) {
      const cap = SCALE_CAPABILITIES.find((c) => c.family === family);
      expect(cap?.transforms).toEqual(["identity", "log10", "sqrt"]);
    }
  });

  it("exposes binned as its own canonical position family", () => {
    const binned = SCALE_CAPABILITIES.find((c) => c.family === "position-binned");
    expect(binned?.scaleTypes).toEqual(["binned"]);
    expect(binned?.runtime).toBe("implemented");
  });
});

describe("every claimed helper is a real export with alias identity", () => {
  for (const cap of positionFamilies) {
    for (const name of cap.helpers as readonly string[]) {
      it(`${cap.family}: ${name} is an exported function`, () => {
        expect(typeof registry[name]).toBe("function");
      });
    }
  }

  it("ggplot2 snake_case aliases are binding-identical to their camelCase source", () => {
    const snakeToCamel: Record<string, string> = {
      scale_x_continuous: "scaleXContinuous",
      scale_y_continuous: "scaleYContinuous",
      scale_x_log10: "scaleXLog10",
      scale_y_log10: "scaleYLog10",
      scale_x_sqrt: "scaleXSqrt",
      scale_y_sqrt: "scaleYSqrt",
      scale_x_reverse: "scaleXReverse",
      scale_y_reverse: "scaleYReverse",
      scale_x_binned: "scaleXBinned",
      scale_y_binned: "scaleYBinned",
    };
    for (const [snake, camel] of Object.entries(snakeToCamel)) {
      expect(registry[snake]).toBe(registry[camel]);
    }
  });
});

describe("every claimed helper normalizes to its declared family", () => {
  const familyOf = (t: string | undefined): string =>
    t === "binned" ? "position-binned" : "position-continuous";

  for (const cap of positionFamilies) {
    if (cap.family !== "position-continuous" && cap.family !== "position-binned") continue;
    for (const name of cap.helpers as readonly string[]) {
      it(`${name} produces a ${cap.family} scale`, () => {
        const fn = registry[name] as (options?: unknown) => Scales;
        const produced = fn();
        const axisScale = produced.x ?? produced.y;
        expect(familyOf(axisScale?.type)).toBe(cap.family);
        // and the emitted scale is a normalize() fixed point through a real spec
        const normalized = normalize({
          layers: [{ geom: "point", aes: { x: "a", y: "b" } }],
          scales: produced,
        });
        expect(normalize(normalized)).toEqual(normalized);
      });
    }
  }
});
