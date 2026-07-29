/**
 * SCALE_REFERENCE: per-Scale* API docs derived from SCALE_CAPABILITIES + schema.
 */
import { describe, expect, it } from "bun:test";

import {
  SCALE_CAPABILITIES,
  STYLE_ORDINAL_SCALE_HELPERS,
  scaleCapabilityCamelHelpers,
} from "../src/capabilities.ts";
import {
  SCALE_REFERENCE,
  allScaleHelpers,
  componentNameForScaleHelper,
  knownScaleSlugs,
  primaryScaleHelpers,
  scaleReferenceByFamily,
  scaleReferenceList,
  scaleReferencePrimaries,
  slugForScaleHelper,
} from "../src/scale-reference.ts";

describe("componentNameForScaleHelper / slugForScaleHelper", () => {
  it("maps helpers to Scale* components and snake slugs", () => {
    expect(componentNameForScaleHelper("scaleXContinuous")).toBe("ScaleXContinuous");
    expect(componentNameForScaleHelper("scaleColorViridisC")).toBe("ScaleColorViridisC");
    expect(slugForScaleHelper("scaleXContinuous")).toBe("x_continuous");
    expect(slugForScaleHelper("scaleColorViridisC")).toBe("color_viridis_c");
    expect(slugForScaleHelper("scaleSizeBinnedArea")).toBe("size_binned_area");
  });
});

describe("SCALE_REFERENCE", () => {
  it("covers every public Scale* helper exactly once", () => {
    const helpers = allScaleHelpers();
    expect(scaleReferenceList()).toHaveLength(helpers.length);
    expect(knownScaleSlugs().toSorted()).toEqual(
      helpers.map((h) => slugForScaleHelper(h)).toSorted(),
    );
    for (const helper of helpers) {
      const slug = slugForScaleHelper(helper);
      expect(SCALE_REFERENCE[slug]?.helper, slug).toBe(helper);
    }
  });

  it("primaries match scaleCapabilityCamelHelpers", () => {
    expect(primaryScaleHelpers().toSorted()).toEqual([...scaleCapabilityCamelHelpers()].toSorted());
    const primaryHelpers = scaleReferencePrimaries()
      .map((e) => e.helper)
      .toSorted();
    expect(primaryHelpers).toEqual([...scaleCapabilityCamelHelpers()].toSorted());
  });

  it("includes Colour and Ordinal aliases as aliasOf entries", () => {
    const colour = SCALE_REFERENCE.colour_continuous;
    expect(colour?.aliasOf).toBe("color_continuous");
    expect(colour?.component).toBe("ScaleColourContinuous");

    const ordinal = SCALE_REFERENCE.size_ordinal;
    expect(ordinal?.aliasOf).toBe("size_discrete");
    expect(ordinal?.component).toBe("ScaleSizeOrdinal");

    for (const h of STYLE_ORDINAL_SCALE_HELPERS) {
      const entry = SCALE_REFERENCE[slugForScaleHelper(h)];
      expect(entry?.aliasOf, h).toBeDefined();
    }
  });

  it("every entry has summary, params, guide, and valid family", () => {
    const families = new Set(SCALE_CAPABILITIES.map((c) => c.family));
    for (const entry of scaleReferenceList()) {
      expect(entry.summary.trim().length, entry.slug).toBeGreaterThan(10);
      expect(entry.component, entry.slug).toBe(componentNameForScaleHelper(entry.helper));
      expect(entry.aesthetics.length, entry.slug).toBeGreaterThan(0);
      expect(entry.scaleType, entry.slug).not.toBe("");
      expect(entry.optionsType, entry.slug).not.toBe("");
      expect(entry.guide.trim().length, entry.slug).toBeGreaterThan(10);
      expect(families.has(entry.family), `${entry.slug} family`).toBe(true);
      expect(Array.isArray(entry.params), entry.slug).toBe(true);
      for (const p of entry.params) {
        expect(p.name, entry.slug).toMatch(/^[a-zA-Z]/);
        expect(p.description.trim().length, `${entry.slug}.${p.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("groups primaries by family without dropouts", () => {
    const byFamily = scaleReferenceByFamily();
    let total = 0;
    for (const cap of SCALE_CAPABILITIES) {
      const group = byFamily[cap.family];
      expect(group.length, cap.family).toBeGreaterThan(0);
      total += group.length;
    }
    expect(total).toBe(scaleReferencePrimaries().length);
  });

  it("documents major families used in acceptance examples", () => {
    // continuous color, discrete color, position, size
    expect(SCALE_REFERENCE.color_continuous.scaleType).toBe("sequential");
    expect(SCALE_REFERENCE.color_discrete.scaleType).toBe("ordinal");
    expect(SCALE_REFERENCE.x_continuous.scaleType).toBe("linear");
    expect(SCALE_REFERENCE.size_continuous.scaleType).toBe("sequential");
    expect(SCALE_REFERENCE.color_continuous.params.some((p) => p.name === "scheme")).toBe(true);
    expect(SCALE_REFERENCE.x_continuous.params.some((p) => p.name === "limits")).toBe(true);
  });

  it("lists Colour aliases on primary color shells", () => {
    expect(SCALE_REFERENCE.color_continuous.alsoExportedAs).toContain("ScaleColourContinuous");
    expect(SCALE_REFERENCE.size_discrete.alsoExportedAs).toContain("ScaleSizeOrdinal");
  });
});
