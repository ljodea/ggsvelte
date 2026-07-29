/**
 * Guardrails when inspect axis guides fight bar/col geometry or value labels.
 *
 * Browser lane: these pure collectors feed plot-engine advisories. CI coverage
 * is browser-only (SSR vitest does not collect), so the suite lives here.
 */
import { describe, expect, it } from "vitest";

import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  inspectAxisOnBarColDiagnostics,
  layerGeomsFromSpecLayers,
} from "../../src/lib/interaction/interaction.js";

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
    expect(INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_COL).toBeDefined();
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

  it("warns when col value labels sit under the vertical guide (most egregious)", () => {
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
    // Collector walks geoms in layer order and emits col then bar advisories.
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

  it("keeps each new catalog entry's code equal to its key", () => {
    for (const code of [
      "INTERACTION_INSPECT_X_ON_COL",
      "INTERACTION_INSPECT_X_ON_BAR",
      "INTERACTION_INSPECT_X_BISECTS_COL_LABELS",
      "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS",
    ] as const) {
      expect(INTERACTION_DIAGNOSTIC_CATALOG[code].code).toBe(code);
    }
  });
});

describe("layerGeomsFromSpecLayers", () => {
  it("returns an empty list for non-arrays and empty layers", () => {
    // void 0 — oxlint unicorn/no-useless-undefined rejects an undefined literal arg.
    const missing: unknown = void 0;
    expect(layerGeomsFromSpecLayers(missing)).toEqual([]);
    expect(layerGeomsFromSpecLayers(null)).toEqual([]);
    expect(layerGeomsFromSpecLayers("col")).toEqual([]);
    expect(layerGeomsFromSpecLayers({})).toEqual([]);
    expect(layerGeomsFromSpecLayers([])).toEqual([]);
  });

  it("collects non-empty geom strings and skips junk entries", () => {
    expect(
      layerGeomsFromSpecLayers([
        { geom: "col" },
        null,
        "skip",
        { geom: "" },
        { geom: 12 },
        ["not-object"],
        { geom: "text" },
        { noGeom: true },
      ]),
    ).toEqual(["col", "text"]);
  });
});
