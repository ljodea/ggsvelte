/**
 * COORD_REFERENCE: per-coord API docs derived from SpecDeclarations.
 */
import { describe, expect, it } from "bun:test";

import {
  COORD_REFERENCE,
  coordReferenceList,
  KNOWN_COORD_TYPES,
  type CoordReferenceEntry,
} from "../src/coord-reference.ts";

describe("COORD_REFERENCE", () => {
  it("covers every KNOWN_COORD_TYPES entry exactly once", () => {
    expect(Object.keys(COORD_REFERENCE).toSorted()).toEqual([...KNOWN_COORD_TYPES].toSorted());
    expect(KNOWN_COORD_TYPES).toHaveLength(5);
  });

  it("every entry has summary, component, typeLiteral, and matching slug", () => {
    for (const name of KNOWN_COORD_TYPES) {
      const entry = COORD_REFERENCE[name];
      expect(entry.name, name).toBe(name);
      expect(entry.slug, name).toBe(name);
      expect(entry.typeLiteral, name).toBe(name);
      expect(entry.component, name).toMatch(/^Coord/);
      expect(entry.summary.trim().length, `${name} summary`).toBeGreaterThan(20);
      expect(entry.schemaType, name).not.toBe("");
      expect(Array.isArray(entry.params), name).toBe(true);
      expect(Array.isArray(entry.axisParams), name).toBe(true);
      expect(Array.isArray(entry.builderMethods), name).toBe(true);
      expect(entry.builderMethods.length, name).toBeGreaterThan(0);
    }
  });

  it("coordReferenceList order matches KNOWN_COORD_TYPES", () => {
    expect(coordReferenceList().map((e) => e.name)).toEqual([...KNOWN_COORD_TYPES]);
  });

  it("cartesian and flip have no option params", () => {
    expect(COORD_REFERENCE.cartesian.params).toEqual([]);
    expect(COORD_REFERENCE.flip.params).toEqual([]);
    expect(COORD_REFERENCE.cartesian.helper).toBe("");
    expect(COORD_REFERENCE.flip.helper).toBe("");
    expect(COORD_REFERENCE.flip.builderMethods).toContain("coordFlip");
  });

  it("transform documents clip and axis projectors", () => {
    const t = COORD_REFERENCE.transform;
    expect(t.helper).toBe("coordTransform");
    expect(t.helperAlias).toBe("coord_transform");
    expect(t.params.map((p) => p.name).toSorted()).toEqual(["clip", "x", "y"]);
    expect(t.axisParams.map((p) => p.name).toSorted()).toEqual([
      "expand",
      "limits",
      "reverse",
      "transform",
    ]);
    for (const param of [...t.params, ...t.axisParams]) {
      expect(param.description.trim().length, param.name).toBeGreaterThan(10);
    }
  });

  it("fixed and sf document ratio; fixed also exports CoordEqual helpers", () => {
    const fixed = COORD_REFERENCE.fixed;
    expect(fixed.params.map((p) => p.name)).toEqual(["ratio"]);
    expect(fixed.helper).toBe("coordFixed");
    expect(fixed.helperAlias).toBe("coord_fixed");
    expect(fixed.alsoHelpers).toContain("coordEqual");
    expect(fixed.alsoExportedAs).toContain("CoordEqual");

    const sf = COORD_REFERENCE.sf;
    expect(sf.params.map((p) => p.name)).toEqual(["ratio"]);
    expect(sf.helper).toBe("coordSf");
    expect(sf.helperAlias).toBe("coord_sf");
    expect(sf.alsoExportedAs).toEqual([]);
  });
});

describe("CoordReferenceEntry stability", () => {
  it("entry shape is serializable JSON (docs artifact seam)", () => {
    const sample: CoordReferenceEntry = COORD_REFERENCE.transform;
    const roundTrip = JSON.parse(JSON.stringify(sample)) as CoordReferenceEntry;
    expect(roundTrip).toEqual(sample);
  });
});
