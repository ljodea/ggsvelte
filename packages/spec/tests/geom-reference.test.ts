/**
 * GEOM_REFERENCE: per-geom API docs derived from SpecDeclarations.
 * Completeness and shape tests — the public seam for schema-driven reference.
 */
import { describe, expect, it } from "bun:test";

import {
  GEOM_ALIASES,
  GEOM_DEFAULTS,
  KNOWN_GEOMS,
  KNOWN_POSITIONS,
  KNOWN_STATS,
} from "../src/schema-catalog.ts";
import {
  GEOM_REFERENCE,
  SHARED_LAYER_PROPS,
  componentNameForGeom,
  type GeomReferenceEntry,
} from "../src/geom-reference.ts";

describe("componentNameForGeom", () => {
  it("maps snake_case geom names to GeomPascal components", () => {
    expect(componentNameForGeom("point")).toBe("GeomPoint");
    expect(componentNameForGeom("bin_2d")).toBe("GeomBin2d");
    expect(componentNameForGeom("density_2d_filled")).toBe("GeomDensity2dFilled");
    expect(componentNameForGeom("qq_line")).toBe("GeomQqLine");
  });
});

describe("GEOM_REFERENCE", () => {
  it("covers every KNOWN_GEOMS entry exactly once", () => {
    expect(Object.keys(GEOM_REFERENCE).toSorted()).toEqual([...KNOWN_GEOMS].toSorted());
    expect(KNOWN_GEOMS).toHaveLength(49);
  });

  it("every entry has a non-empty summary, component, and slug", () => {
    for (const geom of KNOWN_GEOMS) {
      const entry = GEOM_REFERENCE[geom];
      expect(entry.name, geom).toBe(geom);
      expect(entry.slug, geom).toBe(geom);
      expect(entry.component, geom).toBe(componentNameForGeom(geom));
      expect(entry.summary.trim().length, `${geom} summary`).toBeGreaterThan(10);
      expect(entry.paramsType, geom).toMatch(/Params$/);
    }
  });

  it("defaults match GEOM_DEFAULTS", () => {
    for (const geom of KNOWN_GEOMS) {
      const entry = GEOM_REFERENCE[geom];
      expect(entry.defaultStat, geom).toBe(GEOM_DEFAULTS[geom].stat);
      expect(entry.defaultPosition, geom).toBe(GEOM_DEFAULTS[geom].position);
    }
  });

  it("allowed stats and positions are non-empty subsets of catalogs", () => {
    const stats = new Set<string>(KNOWN_STATS);
    const positions = new Set<string>(KNOWN_POSITIONS);
    for (const geom of KNOWN_GEOMS) {
      const entry = GEOM_REFERENCE[geom];
      expect(entry.allowedStats.length, `${geom} stats`).toBeGreaterThan(0);
      expect(entry.allowedPositions.length, `${geom} positions`).toBeGreaterThan(0);
      for (const s of entry.allowedStats) {
        expect(stats.has(s), `${geom} unknown stat ${s}`).toBe(true);
      }
      for (const p of entry.allowedPositions) {
        expect(positions.has(p), `${geom} unknown position ${p}`).toBe(true);
      }
      expect(entry.allowedStats, `${geom} includes default stat`).toContain(entry.defaultStat);
      expect(entry.allowedPositions, `${geom} includes default position`).toContain(
        entry.defaultPosition,
      );
    }
  });

  it("point documents dual Svelte/JSON API surface", () => {
    const point = GEOM_REFERENCE.point;
    expect(point.component).toBe("GeomPoint");
    expect(point.summary.toLowerCase()).toMatch(/point|scatter/);
    expect([...point.allowedStats].toSorted()).toEqual(
      ["identity", "manual", "sum", "summary_bin", "summary_rolling", "unique"].toSorted(),
    );
    expect([...point.allowedPositions].toSorted()).toEqual(
      ["identity", "jitter", "nudge"].toSorted(),
    );
    const size = point.params.find((p) => p.name === "size");
    expect(size).toBeDefined();
    expect(size!.description).toMatch(/radius|px/i);
    expect(size!.typeSummary).toBe("number");
    expect(size!.required).toBe(false);
    // Shared layer props are not duplicated into params.
    expect(point.params.map((p) => p.name)).not.toContain("stat");
    expect(point.params.map((p) => p.name)).not.toContain("data");
  });

  it("bar default stat is count and stackable positions include stack", () => {
    const bar = GEOM_REFERENCE.bar;
    expect(bar.defaultStat).toBe("count");
    expect(bar.defaultPosition).toBe("stack");
    expect(bar.allowedPositions).toContain("stack");
    expect(bar.allowedPositions).toContain("dodge");
  });

  it("alias geoms record their normalize target", () => {
    for (const [alias, target] of Object.entries(GEOM_ALIASES)) {
      const entry = GEOM_REFERENCE[alias as keyof typeof GEOM_ALIASES];
      expect(entry.aliasOf, alias).toBe(target);
    }
    expect(GEOM_REFERENCE.point.aliasOf).toBeUndefined();
  });

  it("every param has a non-empty description", () => {
    const missing: string[] = [];
    for (const geom of KNOWN_GEOMS) {
      for (const param of GEOM_REFERENCE[geom].params) {
        if (param.description.trim() === "") {
          missing.push(`${geom}.${param.name}`);
        }
      }
    }
    expect(missing, `params missing descriptions: ${missing.join(", ")}`).toEqual([]);
  });

  it("user-facing summaries and param descriptions omit ggplot2 and issue numbers", () => {
    const dirty = /ggplot2|#\d{3,5}\b/i;
    const hits: string[] = [];
    for (const geom of KNOWN_GEOMS) {
      const entry = GEOM_REFERENCE[geom];
      if (dirty.test(entry.summary)) hits.push(`${geom} summary`);
      for (const param of entry.params) {
        if (dirty.test(param.description)) hits.push(`${geom}.${param.name}`);
      }
    }
    expect(hits, `dirty prose: ${hits.join(", ")}`).toEqual([]);
  });

  it("SHARED_LAYER_PROPS documents the props common to every Geom* shell", () => {
    const names = SHARED_LAYER_PROPS.map((p) => p.name);
    expect(names).toEqual([
      "data",
      "aes",
      "stat",
      "position",
      "positionParams",
      "render",
      "inspect",
    ]);
    for (const prop of SHARED_LAYER_PROPS) {
      expect(prop.description.trim().length, prop.name).toBeGreaterThan(10);
    }
  });
});

describe("GeomReferenceEntry stability", () => {
  it("entry shape is serializable JSON (docs artifact seam)", () => {
    const sample: GeomReferenceEntry = GEOM_REFERENCE.line;
    const roundTrip = JSON.parse(JSON.stringify(sample)) as GeomReferenceEntry;
    expect(roundTrip).toEqual(sample);
  });
});
