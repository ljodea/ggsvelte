/**
 * Pure inspect×geom collectors — shared by host ondiagnostic and CLI --inspect.
 */
import { describe, expect, it } from "bun:test";

import {
  collectInspectIntentDiagnostics,
  HIGH_CARDINALITY_DISCRETE_THRESHOLD,
  INSPECT_GEOM_DIAGNOSTIC_CATALOG,
  inspectAxisOnBarColDiagnostics,
  inspectAxisOnDistributionDiagnostics,
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
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      code: "INTERACTION_INSPECT_X_ON_COL",
      severity: "advisory",
      prop: "inspect.mode",
      actual: "xy",
    });
    expect(INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_COL).toBeDefined();
  });

  it("advises when bar is inspected with a vertical (x) guide", () => {
    const list = inspectAxisOnBarColDiagnostics("x", ["bar"]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      code: "INTERACTION_INSPECT_X_ON_BAR",
      severity: "advisory",
      prop: "inspect.mode",
      actual: "x",
    });
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

  // #1409 — product decision: x/xy still fire under coord_flip (band guide
  // remains; only screen orientation swaps). Mode y alone never fires.
  describe("coord_flip (#1409)", () => {
    it("still fires for mode x and xy (band-axis guide still fights the mark)", () => {
      expect(inspectAxisOnBarColDiagnostics("x", ["col"]).map((d) => d.code)).toEqual([
        "INTERACTION_INSPECT_X_ON_COL",
      ]);
      expect(inspectAxisOnBarColDiagnostics("xy", ["bar", "text"]).map((d) => d.code)).toEqual([
        "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS",
      ]);
    });

    it("stays silent for mode y (value-axis guide, not the x band)", () => {
      expect(inspectAxisOnBarColDiagnostics("y", ["col", "bar", "text"])).toEqual([]);
    });

    it("catalog messages mention coord_flip so agents do not treat orientation as a free pass", () => {
      for (const code of [
        "INTERACTION_INSPECT_X_ON_COL",
        "INTERACTION_INSPECT_X_ON_BAR",
        "INTERACTION_INSPECT_X_BISECTS_COL_LABELS",
        "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS",
      ] as const) {
        expect(INSPECT_GEOM_DIAGNOSTIC_CATALOG[code].message.toLowerCase()).toContain("coord_flip");
      }
    });
  });
});

describe("layerGeomsFromSpecLayers", () => {
  it("extracts geom names and skips non-objects", () => {
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

describe("inspectAxisOnDistributionDiagnostics (#1528)", () => {
  const CODE_BY_GEOM = {
    violin: "INTERACTION_INSPECT_AXIS_ON_VIOLIN",
    boxplot: "INTERACTION_INSPECT_AXIS_ON_BOXPLOT",
    errorbar: "INTERACTION_INSPECT_AXIS_ON_ERRORBAR",
    linerange: "INTERACTION_INSPECT_AXIS_ON_LINERANGE",
    pointrange: "INTERACTION_INSPECT_AXIS_ON_POINTRANGE",
    crossbar: "INTERACTION_INSPECT_AXIS_ON_CROSSBAR",
  } as const;

  it("is empty when inspect is off or mode is auto/exact", () => {
    expect(inspectAxisOnDistributionDiagnostics(null, ["violin"])).toEqual([]);
    expect(inspectAxisOnDistributionDiagnostics("auto", ["violin", "boxplot"])).toEqual([]);
    expect(inspectAxisOnDistributionDiagnostics("exact", ["errorbar"])).toEqual([]);
  });

  it("is empty when mode is an axis guide but no distribution/interval layers exist", () => {
    expect(inspectAxisOnDistributionDiagnostics("x", ["point", "line"])).toEqual([]);
    expect(inspectAxisOnDistributionDiagnostics("xy", ["col", "bar"])).toEqual([]);
  });

  it("always advises violin/boxplot under mode x (no scale flag needed)", () => {
    for (const geom of ["violin", "boxplot"] as const) {
      const list = inspectAxisOnDistributionDiagnostics("x", [geom]);
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        code: CODE_BY_GEOM[geom],
        severity: "advisory",
        prop: "inspect.mode",
        actual: "x",
      });
    }
  });

  it("skips interval geoms unless discreteBandAxis is true", () => {
    for (const geom of ["errorbar", "linerange", "pointrange", "crossbar"] as const) {
      expect(inspectAxisOnDistributionDiagnostics("x", [geom])).toEqual([]);
    }
    for (const geom of ["errorbar", "linerange", "pointrange", "crossbar"] as const) {
      const list = inspectAxisOnDistributionDiagnostics("x", [geom], {
        discreteBandAxis: true,
      });
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        code: CODE_BY_GEOM[geom],
        severity: "advisory",
        actual: "x",
      });
    }
  });

  it("advises for mode y and xy on always-band geoms", () => {
    expect(inspectAxisOnDistributionDiagnostics("y", ["violin"]).map((d) => d.code)).toEqual([
      "INTERACTION_INSPECT_AXIS_ON_VIOLIN",
    ]);
    expect(inspectAxisOnDistributionDiagnostics("xy", ["boxplot"])[0]).toMatchObject({
      code: "INTERACTION_INSPECT_AXIS_ON_BOXPLOT",
      actual: "xy",
    });
  });

  it("covers the concrete gallery bad case: violin + categorical x + mode x", () => {
    const list = inspectAxisOnDistributionDiagnostics("x", ["violin"]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      code: "INTERACTION_INSPECT_AXIS_ON_VIOLIN",
      severity: "advisory",
      prop: "inspect.mode",
      actual: "x",
    });
    expect(list[0]?.suggestions.some((s) => s.includes("exact"))).toBe(true);
  });

  it("keeps catalog code equal to its key for AXIS_ON_* entries", () => {
    for (const code of Object.values(CODE_BY_GEOM)) {
      expect(INSPECT_GEOM_DIAGNOSTIC_CATALOG[code].code).toBe(code);
    }
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

  it("emits AXIS_ON_VIOLIN for violin + mode x (#1528)", () => {
    const list = collectInspectIntentDiagnostics([{ geom: "violin" }], "x");
    expect(list.map((d) => d.code)).toEqual(["INTERACTION_INSPECT_AXIS_ON_VIOLIN"]);
  });

  it("does not emit AXIS_ON_ERRORBAR without discreteBandAxis (continuous shared-x is legit)", () => {
    expect(collectInspectIntentDiagnostics([{ geom: "errorbar" }], "x").map((d) => d.code)).toEqual(
      [],
    );
    expect(
      collectInspectIntentDiagnostics([{ geom: "errorbar" }], "x", {
        discreteBandAxis: true,
      }).map((d) => d.code),
    ).toEqual(["INTERACTION_INSPECT_AXIS_ON_ERRORBAR"]);
  });

  it("is silent without host intent or for auto/exact", () => {
    expect(collectInspectIntentDiagnostics([{ geom: "col" }], null)).toEqual([]);
    expect(collectInspectIntentDiagnostics([{ geom: "col" }], "auto")).toEqual([]);
    expect(collectInspectIntentDiagnostics([{ geom: "col" }], "exact")).toEqual([]);
    expect(collectInspectIntentDiagnostics([{ geom: "violin" }], "auto")).toEqual([]);
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
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      code: "INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE",
      prop: "color",
      actual: HIGH_CARDINALITY_DISCRETE_THRESHOLD,
    });
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
