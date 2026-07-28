/**
 * POSITION_REFERENCE: per-position API docs derived from catalogs + GEOM_REFERENCE.
 */
import { describe, expect, it } from "bun:test";

import { GEOM_DEFAULTS, KNOWN_GEOMS, KNOWN_POSITIONS } from "../src/schema-catalog.ts";
import {
  POSITION_REFERENCE,
  positionReferenceList,
  type PositionReferenceEntry,
} from "../src/position-reference.ts";

describe("POSITION_REFERENCE", () => {
  it("covers every KNOWN_POSITIONS entry exactly once", () => {
    expect(Object.keys(POSITION_REFERENCE).toSorted()).toEqual([...KNOWN_POSITIONS].toSorted());
    expect(KNOWN_POSITIONS).toHaveLength(6);
  });

  it("every entry has a non-empty summary and matching slug", () => {
    for (const position of KNOWN_POSITIONS) {
      const entry = POSITION_REFERENCE[position];
      expect(entry.name, position).toBe(position);
      expect(entry.slug, position).toBe(position);
      expect(entry.summary.trim().length, `${position} summary`).toBeGreaterThan(20);
    }
  });

  it("compatibleGeoms are non-empty subsets of KNOWN_GEOMS that allow the position", () => {
    const geoms = new Set<string>(KNOWN_GEOMS);
    for (const position of KNOWN_POSITIONS) {
      const entry = POSITION_REFERENCE[position];
      expect(entry.compatibleGeoms.length, `${position} geoms`).toBeGreaterThan(0);
      for (const geom of entry.compatibleGeoms) {
        expect(geoms.has(geom), `${position} unknown geom ${geom}`).toBe(true);
      }
    }
  });

  it("defaultForGeoms matches GEOM_DEFAULTS and is a subset of compatibleGeoms", () => {
    for (const position of KNOWN_POSITIONS) {
      const entry = POSITION_REFERENCE[position];
      const fromDefaults = KNOWN_GEOMS.filter((g) => GEOM_DEFAULTS[g].position === position);
      expect([...entry.defaultForGeoms].toSorted(), position).toEqual([...fromDefaults].toSorted());
      for (const geom of entry.defaultForGeoms) {
        expect(entry.compatibleGeoms, `${position} default ${geom}`).toContain(geom);
      }
    }
  });

  it("stack is default for bar/col/histogram/area and has no positionParams", () => {
    const stack = POSITION_REFERENCE.stack;
    expect(stack.defaultForGeoms).toContain("bar");
    expect(stack.defaultForGeoms).toContain("col");
    expect(stack.params).toEqual([]);
    expect(stack.summary.toLowerCase()).toMatch(/stack/);
  });

  it("jitter documents width/height/seed params from PositionParams", () => {
    const jitter = POSITION_REFERENCE.jitter;
    expect(jitter.params.map((p) => p.name).toSorted()).toEqual(["height", "seed", "width"]);
    for (const param of jitter.params) {
      expect(param.description.trim().length, param.name).toBeGreaterThan(10);
      expect(param.typeSummary).toMatch(/number|integer/);
    }
    expect(jitter.compatibleGeoms).toContain("point");
    expect(jitter.compatibleGeoms).toContain("jitter");
  });

  it("nudge documents x/y params", () => {
    const nudge = POSITION_REFERENCE.nudge;
    expect(nudge.params.map((p) => p.name).toSorted()).toEqual(["x", "y"]);
    expect(nudge.defaultForGeoms).toEqual([]);
  });

  it("identity is default for most geoms and has no params", () => {
    const identity = POSITION_REFERENCE.identity;
    expect(identity.params).toEqual([]);
    expect(identity.defaultForGeoms.length).toBeGreaterThan(20);
  });

  it("positionReferenceList order matches KNOWN_POSITIONS", () => {
    expect(positionReferenceList().map((e) => e.name)).toEqual([...KNOWN_POSITIONS]);
  });
});

describe("PositionReferenceEntry stability", () => {
  it("entry shape is serializable JSON (docs artifact seam)", () => {
    const sample: PositionReferenceEntry = POSITION_REFERENCE.dodge;
    const roundTrip = JSON.parse(JSON.stringify(sample)) as PositionReferenceEntry;
    expect(roundTrip).toEqual(sample);
  });
});
