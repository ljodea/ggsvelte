/**
 * Pure inspect×geom collectors — shared by host ondiagnostic and CLI --inspect.
 */
import { describe, expect, it } from "bun:test";

import {
  collectInspectIntentDiagnostics,
  HIGH_CARDINALITY_DISCRETE_THRESHOLD,
  INSPECT_GEOM_DIAGNOSTIC_CATALOG,
  inspectAxisOnBarColDiagnostics,
  inspectHighCardinalityDiagnostics,
  isInspectIntentMode,
  layerGeomsFromSpecLayers,
} from "../src/inspect-geom-advisories.ts";

describe("inspectAxisOnBarColDiagnostics", () => {
  it("is empty when inspect is off or mode is auto/exact/y", () => {
    expect(inspectAxisOnBarColDiagnostics(null, ["col"])).toEqual([]);
    expect(inspectAxisOnBarColDiagnostics("auto", ["col", "bar"])).toEqual([]);
    expect(inspectAxisOnBarColDiagnostics("exact", ["col"])).toEqual([]);
    expect(inspectAxisOnBarColDiagnostics("y", ["bar"])).toEqual([]);
  });

  it("is empty when mode is x/xy but no bar/col layers exist", () => {
    expect(inspectAxisOnBarColDiagnostics("xy", ["point", "text"])).toEqual([]);
    expect(inspectAxisOnBarColDiagnostics("x", ["line", "area"])).toEqual([]);
  });

  it("advises when col is inspected with a vertical (x) guide", () => {
    const list = inspectAxisOnBarColDiagnostics("xy", ["col"]);
    expect(list).toEqual([
      expect.objectContaining({
        code: "INTERACTION_INSPECT_X_ON_COL",
        severity: "advisory",
        prop: "inspect.mode",
        actual: "xy",
      }),
    ]);
    expect(INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_COL).toBeDefined();
  });

  it("advises when bar is inspected with a vertical (x) guide", () => {
    const list = inspectAxisOnBarColDiagnostics("x", ["bar"]);
    expect(list).toEqual([
      expect.objectContaining({
        code: "INTERACTION_INSPECT_X_ON_BAR",
        severity: "advisory",
        prop: "inspect.mode",
        actual: "x",
      }),
    ]);
  });

  it("warns when col value labels sit under the vertical guide", () => {
    const list = inspectAxisOnBarColDiagnostics("xy", ["col", "text"]);
    expect(list.map((d) => d.code)).toEqual(["INTERACTION_INSPECT_X_BISECTS_COL_LABELS"]);
    expect(list[0]).toMatchObject({
      severity: "warning",
      prop: "inspect.mode",
      actual: "xy",
    });
  });

  it("warns when bar value labels sit under the vertical guide", () => {
    const list = inspectAxisOnBarColDiagnostics("x", ["bar", "label"]);
    expect(list.map((d) => d.code)).toEqual(["INTERACTION_INSPECT_X_BISECTS_BAR_LABELS"]);
    expect(list[0]?.severity).toBe("warning");
  });

  it("prefers the labels warning over the plain bar/col advisory", () => {
    const list = inspectAxisOnBarColDiagnostics("xy", ["col", "bar", "text"]);
    expect(list.map((d) => d.code)).toEqual([
      "INTERACTION_INSPECT_X_BISECTS_COL_LABELS",
      "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS",
    ]);
  });

  it("treats sf_text / sf_label as value-label geoms for the bisect warning", () => {
    expect(inspectAxisOnBarColDiagnostics("xy", ["col", "sf_text"]).map((d) => d.code)).toEqual([
      "INTERACTION_INSPECT_X_BISECTS_COL_LABELS",
    ]);
    expect(inspectAxisOnBarColDiagnostics("xy", ["bar", "sf_label"]).map((d) => d.code)).toEqual([
      "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS",
    ]);
  });
});

describe("layerGeomsFromSpecLayers", () => {
  it("extracts geom names and skips non-objects", () => {
    expect(layerGeomsFromSpecLayers(undefined)).toEqual([]);
    expect(layerGeomsFromSpecLayers(null)).toEqual([]);
    expect(layerGeomsFromSpecLayers("col")).toEqual([]);
    expect(layerGeomsFromSpecLayers({})).toEqual([]);
    expect(layerGeomsFromSpecLayers([])).toEqual([]);
    expect(
      layerGeomsFromSpecLayers([
        { geom: "col" },
        { geom: "text" },
        null,
        { geom: 1 },
        { notGeom: "bar" },
        "skip",
      ]),
    ).toEqual(["col", "text"]);
  });

  it("rewrites alias geoms the same way normalize does (histogram→bar)", () => {
    expect(layerGeomsFromSpecLayers([{ geom: "histogram" }, { geom: "jitter" }])).toEqual([
      "bar",
      "point",
    ]);
  });
});

describe("collectInspectIntentDiagnostics", () => {
  it("emits INTERACTION_INSPECT_X_ON_COL from PortableSpec layers + host intent", () => {
    const list = collectInspectIntentDiagnostics([{ geom: "col" }], "xy");
    expect(list.map((d) => d.code)).toEqual(["INTERACTION_INSPECT_X_ON_COL"]);
  });

  it("emits INTERACTION_INSPECT_X_ON_BAR for authoring alias geom histogram", () => {
    const list = collectInspectIntentDiagnostics([{ geom: "histogram" }], "xy");
    expect(list.map((d) => d.code)).toEqual(["INTERACTION_INSPECT_X_ON_BAR"]);
  });

  it("is silent without host intent or for auto/exact", () => {
    expect(collectInspectIntentDiagnostics([{ geom: "col" }], null)).toEqual([]);
    expect(collectInspectIntentDiagnostics([{ geom: "col" }], "auto")).toEqual([]);
    expect(collectInspectIntentDiagnostics([{ geom: "col" }], "exact")).toEqual([]);
  });
});

describe("inspectHighCardinalityDiagnostics", () => {
  it("fires once per channel over the threshold when inspect is enabled", () => {
    const list = inspectHighCardinalityDiagnostics({
      inspectEnabled: true,
      domainSizes: [
        { channel: "color", size: HIGH_CARDINALITY_DISCRETE_THRESHOLD },
        { channel: "fill", size: HIGH_CARDINALITY_DISCRETE_THRESHOLD - 1 },
      ],
    });
    expect(list).toEqual([
      expect.objectContaining({
        code: "INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE",
        prop: "color",
        actual: HIGH_CARDINALITY_DISCRETE_THRESHOLD,
      }),
    ]);
  });

  it("is silent when inspect is off", () => {
    expect(
      inspectHighCardinalityDiagnostics({
        inspectEnabled: false,
        domainSizes: [{ channel: "color", size: 100 }],
      }),
    ).toEqual([]);
  });
});

describe("isInspectIntentMode", () => {
  it("accepts the host inspect mode enum", () => {
    for (const mode of ["auto", "exact", "x", "y", "xy"]) {
      expect(isInspectIntentMode(mode)).toBe(true);
    }
    expect(isInspectIntentMode("nearest")).toBe(false);
    expect(isInspectIntentMode("")).toBe(false);
  });
});
