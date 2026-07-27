/**
 * The alias table is the source of truth for which geom names normalize()
 * rewrites away (#1042). These tests drive normalize() rather than compare the
 * constant to a hand-written list, so the table cannot drift from the rewrite
 * it documents, and an alias whose target is itself an alias fails here.
 */
import { describe, expect, it } from "bun:test";

import { ALIAS_GEOMS, GEOM_ALIASES, KNOWN_GEOMS } from "../src/schema-catalog.ts";
import { normalize } from "../src/normalize.ts";
import type { SpecInput } from "../src/normalize.ts";

/** Minimal x/y mapping so every alias normalizes without a required-channel gap. */
const xy = { x: "x", y: "y" } as const;

describe("geom aliases (#1042)", () => {
  it("rewrites every listed alias to its table target", () => {
    for (const alias of ALIAS_GEOMS) {
      const spec = normalize({ layers: [{ geom: alias, aes: xy }] });
      expect(spec.layers[0]?.geom).toBe(GEOM_ALIASES[alias]);
    }
  });

  it("never rewrites an alias to another alias", () => {
    for (const alias of ALIAS_GEOMS) {
      expect(ALIAS_GEOMS).not.toContain(GEOM_ALIASES[alias]);
    }
  });

  it("leaves every non-alias geom name alone", () => {
    const canonical = KNOWN_GEOMS.filter((geom) => !ALIAS_GEOMS.includes(geom));
    for (const geom of canonical) {
      const spec = normalize({ layers: [{ geom, aes: xy }] } as SpecInput);
      expect(spec.layers[0]?.geom).toBe(geom);
    }
  });

  it("lists aliases that are real geom names", () => {
    for (const alias of ALIAS_GEOMS) expect(KNOWN_GEOMS).toContain(alias);
  });
});
