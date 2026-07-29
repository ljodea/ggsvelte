/**
 * GUIDE_REFERENCE: per-guide API docs derived from *GuideSpec + aesthetic rules.
 */
import { describe, expect, it } from "bun:test";

import {
  GUIDE_CHANNELS,
  GUIDE_REFERENCE,
  KNOWN_GUIDE_TYPES,
  guideReferenceList,
  type GuideReferenceEntry,
} from "../src/guide-reference.ts";
import { SpecDeclarations } from "../src/schema-declarations.ts";

describe("GUIDE_REFERENCE", () => {
  it("covers every KNOWN_GUIDE_TYPES entry exactly once", () => {
    expect(Object.keys(GUIDE_REFERENCE).toSorted()).toEqual([...KNOWN_GUIDE_TYPES].toSorted());
    expect(KNOWN_GUIDE_TYPES).toHaveLength(5);
  });

  it("every entry has a non-empty summary, matching slug, and component name", () => {
    for (const name of KNOWN_GUIDE_TYPES) {
      const entry = GUIDE_REFERENCE[name];
      expect(entry.name, name).toBe(name);
      expect(entry.slug, name).toBe(name);
      expect(entry.typeLiteral, name).toBe(name);
      expect(entry.summary.trim().length, `${name} summary`).toBeGreaterThan(20);
      expect(entry.component, name).toMatch(/^Guide[A-Z]/);
      expect(entry.helper, name).toMatch(/^guide[A-Z]/);
      expect(entry.helperAlias, name).toMatch(/^guide_/);
    }
  });

  it("params exclude the type discriminant and match SpecDeclarations properties", () => {
    for (const name of KNOWN_GUIDE_TYPES) {
      const entry = GUIDE_REFERENCE[name];
      const schema = SpecDeclarations[entry.schemaType as keyof typeof SpecDeclarations] as {
        properties?: Record<string, unknown>;
      };
      const propNames = Object.keys(schema.properties ?? {}).filter((p) => p !== "type");
      expect(entry.params.map((p) => p.name).toSorted(), name).toEqual([...propNames].toSorted());
      for (const param of entry.params) {
        expect(param.description.trim().length, `${name}.${param.name}`).toBeGreaterThan(10);
        expect(param.typeSummary, `${name}.${param.name}`).not.toBe("unknown");
        expect(param.required, `${name}.${param.name}`).toBe(false);
      }
    }
  });

  it("axis only keys positional channels; none keys every channel", () => {
    expect([...GUIDE_REFERENCE.axis.channels]).toEqual(["x", "y"]);
    expect([...GUIDE_REFERENCE.none.channels].toSorted()).toEqual([...GUIDE_CHANNELS].toSorted());
    expect(GUIDE_REFERENCE.legend.channels).toContain("color");
    expect(GUIDE_REFERENCE.legend.channels).not.toContain("x");
    expect(GUIDE_REFERENCE.colorbar.channels).toEqual(["color", "fill"]);
    expect(GUIDE_REFERENCE.colorsteps.channels).toEqual(["color", "fill"]);
  });

  it("legend documents position, direction, keySize, and order", () => {
    const legend = GUIDE_REFERENCE.legend;
    expect(legend.component).toBe("GuideLegend");
    expect(legend.params.map((p) => p.name)).toEqual(
      expect.arrayContaining(["title", "order", "position", "direction", "keySize", "collision"]),
    );
    const position = legend.params.find((p) => p.name === "position");
    expect(position?.typeSummary).toContain('"auto"');
    expect(position?.typeSummary).toContain('"right"');
    expect(position?.typeSummary).toContain('"bottom"');
  });

  it("colorbar and colorsteps document continuous-guide options", () => {
    const colorbar = GUIDE_REFERENCE.colorbar;
    expect(colorbar.component).toBe("GuideColorbar");
    expect(colorbar.params.map((p) => p.name)).toEqual(
      expect.arrayContaining(["showTicks", "showLabels", "position", "direction"]),
    );
    expect(colorbar.params.find((p) => p.name === "keySize")).toBeUndefined();

    const colorsteps = GUIDE_REFERENCE.colorsteps;
    expect(colorsteps.component).toBe("GuideColorsteps");
    expect(colorsteps.params.map((p) => p.name)).toContain("showLabels");
    expect(colorsteps.params.find((p) => p.name === "showTicks")).toBeUndefined();
  });

  it("none has no option params (type-only schema)", () => {
    expect(GUIDE_REFERENCE.none.params).toEqual([]);
    expect(GUIDE_REFERENCE.none.schemaType).toBe("NoneGuideSpec");
  });

  it("guideReferenceList order matches KNOWN_GUIDE_TYPES", () => {
    expect(guideReferenceList().map((e) => e.name)).toEqual([...KNOWN_GUIDE_TYPES]);
  });
});

describe("GuideReferenceEntry stability", () => {
  it("entry shape is serializable JSON (docs artifact seam)", () => {
    const sample: GuideReferenceEntry = GUIDE_REFERENCE.legend;
    const roundTrip = JSON.parse(JSON.stringify(sample)) as GuideReferenceEntry;
    expect(roundTrip).toEqual(sample);
  });
});
