/**
 * STAT_REFERENCE: per-stat API docs derived from catalogs + GEOM_REFERENCE.
 * Completeness and shape tests — the public seam for schema-driven stat reference.
 */
import { describe, expect, it } from "bun:test";

import { GEOM_DEFAULTS, KNOWN_GEOMS, KNOWN_STATS } from "../src/schema-catalog.ts";
import { STAT_COLUMNS } from "../src/validate-data-checks-layer.ts";
import {
  STAT_REFERENCE,
  statReferenceList,
  type StatReferenceEntry,
} from "../src/stat-reference.ts";

describe("STAT_REFERENCE", () => {
  it("covers every KNOWN_STATS entry exactly once", () => {
    expect(Object.keys(STAT_REFERENCE).toSorted()).toEqual([...KNOWN_STATS].toSorted());
    expect(KNOWN_STATS).toHaveLength(28);
  });

  it("every entry has a non-empty summary and matching slug", () => {
    for (const stat of KNOWN_STATS) {
      const entry = STAT_REFERENCE[stat];
      expect(entry.name, stat).toBe(stat);
      expect(entry.slug, stat).toBe(stat);
      expect(entry.summary.trim().length, `${stat} summary`).toBeGreaterThan(20);
    }
  });

  it("generatedColumns match STAT_COLUMNS when present, else empty", () => {
    for (const stat of KNOWN_STATS) {
      const entry = STAT_REFERENCE[stat];
      const expected = STAT_COLUMNS[stat] ?? [];
      expect([...entry.generatedColumns], stat).toEqual([...expected]);
    }
  });

  it("compatibleGeoms are non-empty subsets of KNOWN_GEOMS that allow the stat", () => {
    const geoms = new Set<string>(KNOWN_GEOMS);
    for (const stat of KNOWN_STATS) {
      const entry = STAT_REFERENCE[stat];
      expect(entry.compatibleGeoms.length, `${stat} geoms`).toBeGreaterThan(0);
      for (const geom of entry.compatibleGeoms) {
        expect(geoms.has(geom), `${stat} unknown geom ${geom}`).toBe(true);
        expect(GEOM_DEFAULTS[geom], `${stat}→${geom}`).toBeDefined();
      }
    }
  });

  it("defaultForGeoms matches GEOM_DEFAULTS and is a subset of compatibleGeoms", () => {
    for (const stat of KNOWN_STATS) {
      const entry = STAT_REFERENCE[stat];
      const fromDefaults = KNOWN_GEOMS.filter((g) => GEOM_DEFAULTS[g].stat === stat);
      expect([...entry.defaultForGeoms].toSorted(), stat).toEqual([...fromDefaults].toSorted());
      for (const geom of entry.defaultForGeoms) {
        expect(entry.compatibleGeoms, `${stat} default ${geom}`).toContain(geom);
      }
    }
  });

  it("count documents bar default and generated count column", () => {
    const count = STAT_REFERENCE.count;
    expect(count.defaultForGeoms).toContain("bar");
    expect(count.compatibleGeoms).toContain("bar");
    expect([...count.generatedColumns]).toEqual(["count"]);
    expect(count.summary.toLowerCase()).toMatch(/count|row/);
  });

  it("bin documents histogram/freqpoly defaults and density columns", () => {
    const bin = STAT_REFERENCE.bin;
    expect(bin.defaultForGeoms).toContain("histogram");
    expect(bin.defaultForGeoms).toContain("freqpoly");
    expect(bin.generatedColumns).toContain("count");
    expect(bin.generatedColumns).toContain("density");
  });

  it("identity is the default for most geoms and has no generated columns", () => {
    const identity = STAT_REFERENCE.identity;
    expect(identity.generatedColumns).toEqual([]);
    expect(identity.defaultForGeoms.length).toBeGreaterThan(20);
  });

  it("statReferenceList order matches KNOWN_STATS", () => {
    expect(statReferenceList().map((e) => e.name)).toEqual([...KNOWN_STATS]);
  });
});

describe("StatReferenceEntry stability", () => {
  it("entry shape is serializable JSON (docs artifact seam)", () => {
    const sample: StatReferenceEntry = STAT_REFERENCE.smooth;
    const roundTrip = JSON.parse(JSON.stringify(sample)) as StatReferenceEntry;
    expect(roundTrip).toEqual(sample);
  });
});
