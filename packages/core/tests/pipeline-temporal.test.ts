import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { PipelineError, runPipeline } from "../src/pipeline.ts";

const size = { width: 640, height: 400 };

const yearRows = [
  { year: "1835", value: 1 },
  { year: "1900", value: 2 },
  { year: "2026", value: 3 },
];

describe("temporal pipeline semantics", () => {
  it("infers raw string years as a time scale with epoch domain", () => {
    const model = runPipeline(
      gg(yearRows, aes({ x: "year", y: "value" }))
        .geomLine()
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain[0]).toBe(new Date("1835-01-01T00:00:00.000Z").getTime());
      expect(model.scales.x.domain[1]).toBe(new Date("2026-01-01T00:00:00.000Z").getTime());
    }
    expect(model.advisories.some((advisory) => advisory.code === "temporal-year-inferred")).toBe(
      true,
    );
  });

  it("infers runtime Date values without putting Dates into PortableSpec", () => {
    const first = new Date("2024-01-01T00:00:00.000Z");
    const second = new Date("2024-01-02T12:00:00.000Z");
    const model = runPipeline(
      {
        data: { name: "runtime" },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "when" }, y: { field: "value" } },
          },
        ],
      },
      {
        ...size,
        data: {
          runtime: [
            { when: first, value: 1 },
            { when: second, value: 2 },
          ],
        },
      },
    );
    expect(model.scales.x.type).toBe("time");
    expect(model.row(0)?.["when"]).toBe(first);
  });

  it("lets an explicit discrete scale override string-year inference", () => {
    const model = runPipeline(
      gg(yearRows, aes({ x: "year", y: "value" }))
        .geomLine()
        .scaleXDiscrete()
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("band");
    if (model.scales.x.type === "band")
      expect(model.scales.x.domain).toEqual(["1835", "1900", "2026"]);
  });

  it("uses an explicit ordered parser throughout grouping, frames, and scale training", () => {
    const rows = [
      { when: "01/02/2025", value: 1 },
      { when: "02/03/2025", value: 2 },
      { when: "03/04/2025", value: 3 },
      { when: "04/05/2025", value: 4 },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomLine()
        .scaleXDate({ parse: "dmy" })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("2025-02-01T00:00:00.000Z").getTime(),
        new Date("2025-05-04T00:00:00.000Z").getTime(),
      ]);
    }
    const line = model.scene.batches.find((batch) => batch.kind === "paths");
    expect(line?.kind).toBe("paths");
    if (line?.kind === "paths") expect([...line.pathOffsets]).toEqual([0, 4]);
  });

  it("uses the same parser for explicit domains and breaks", () => {
    const rows = [
      { when: "31/12/2024", value: 1 },
      { when: "02/01/2025", value: 2 },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomPoint()
        .scaleXDate({
          parse: "dmy",
          domain: ["30/12/2024", "03/01/2025"],
          breaks: ["31/12/2024", "02/01/2025"],
          nice: false,
        })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("2024-12-30T00:00:00.000Z").getTime(),
        new Date("2025-01-03T00:00:00.000Z").getTime(),
      ]);
    }
    expect(model.scene.axes.x.ticks).toHaveLength(2);
  });

  it("reuses an unambiguous source parser for domains and breaks", () => {
    const rows = [
      { when: "13/01/2024", value: 1 },
      { when: "03/04/2024", value: 2 },
      { when: "05/06/2024", value: 3 },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomPoint()
        .scaleXDate({
          domain: ["01/01/2024", "01/07/2024"],
          breaks: ["01/02/2024", "01/06/2024"],
          nice: false,
        })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("2024-01-01T00:00:00.000Z").getTime(),
        new Date("2024-07-01T00:00:00.000Z").getTime(),
      ]);
    }
    expect(model.scene.axes.x.ticks).toHaveLength(2);
  });

  it("passes explicit temporal semantics into pre-stat smooth inputs", () => {
    const rows = [
      { when: "01/01/2025", value: 1 },
      { when: "02/01/2025", value: 2 },
      { when: "03/01/2025", value: 3 },
      { when: "04/01/2025", value: 4 },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomSmooth({ method: "lm", se: false })
        .scaleXDate({ parse: "dmy" })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    expect(model.warnings.some((warning) => warning.code === "removed-stat-rows")).toBe(false);
    expect(model.warnings.some((warning) => warning.code === "smooth-group-dropped")).toBe(false);
    expect(model.scene.batches.some((batch) => batch.kind === "paths")).toBe(true);
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("2025-01-01T00:00:00.000Z").getTime(),
        new Date("2025-01-04T00:00:00.000Z").getTime(),
      ]);
    }
  });

  it("retains the source-column parser decision through filtered summary stats", () => {
    const rows = [
      { when: "13/01/2024", value: 1, visibility: "hide" },
      { when: "03/04/2024", value: 2, visibility: "keep" },
      { when: "05/06/2024", value: 3, visibility: "keep" },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomErrorbar({ stat: "summary" })
        .spec(),
      {
        ...size,
        rowFilters: [{ scale: "color", field: "visibility", mode: "exclude", values: ["hide"] }],
      },
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("2024-04-03T00:00:00.000Z").getTime(),
        new Date("2024-06-05T00:00:00.000Z").getTime(),
      ]);
    }
  });

  it("applies timezone and disambiguation to automatically selected parsers", () => {
    const rows = [
      { when: "2024-03-10T01:30:00", value: 1 },
      { when: "2024-03-10T02:30:00", value: 2 },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomLine()
        .scaleXDatetime({
          timezone: "America/New_York",
          disambiguation: "later",
          nice: false,
        })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("2024-03-10T06:30:00.000Z").getTime(),
        new Date("2024-03-10T07:30:00.000Z").getTime(),
      ]);
    }
  });

  it("preserves explicit ordered parsing through free-x facet subsets", () => {
    const rows = [
      { when: "01/02/2025", value: 1, group: "a" },
      { when: "02/03/2025", value: 2, group: "a" },
      { when: "03/04/2025", value: 3, group: "b" },
      { when: "04/05/2025", value: 4, group: "b" },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomLine()
        .scaleXDate({ parse: "dmy", nice: false })
        .facet({ wrap: "group", scales: "free_x" })
        .spec(),
      size,
    );
    expect(model.scales.panels).toHaveLength(2);
    expect(model.scales.panels.map((panel) => panel.x.type)).toEqual(["time", "time"]);
    expect(
      model.scene.batches
        .filter((batch) => batch.kind === "paths")
        .map((batch) => (batch.kind === "paths" ? [...batch.pathOffsets] : [])),
    ).toEqual([
      [0, 2],
      [0, 2],
    ]);
  });

  it("converts count-stat x values with the selected calendar parser", () => {
    const rows = [{ year: "1835" }, { year: "1835" }, { year: "2026" }];
    const model = runPipeline(
      gg(rows, aes({ x: "year" }))
        .geomBar()
        .scaleXDate({ parse: "year", nice: false })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([
        new Date("1835-01-01T00:00:00.000Z").getTime(),
        new Date("2026-01-01T00:00:00.000Z").getTime(),
      ]);
    }
  });

  it("passes semantic epoch numbers through resolved parsers for rules and formatters", () => {
    const epoch = Date.UTC(1900, 0, 1);
    const inferred = runPipeline(
      gg(yearRows, aes({ x: "year", y: "value" }))
        .geomPoint()
        .geomRule({ xintercept: epoch })
        .spec(),
      size,
    );
    expect(inferred.scene.batches.some((batch) => batch.kind === "segments")).toBe(true);
    expect(inferred.warnings.some((warning) => warning.code === "removed-missing")).toBe(false);
    expect(inferred.axisFormatters.x(epoch)).toContain("1900");

    const explicit = runPipeline(
      gg(
        [
          { when: "01/02/2025", value: 1 },
          { when: "02/03/2025", value: 2 },
        ],
        aes({ x: "when", y: "value" }),
      )
        .geomPoint()
        .geomRule({ xintercept: Date.UTC(2025, 2, 1) })
        .scaleXDate({ parse: "dmy" })
        .spec(),
      size,
    );
    expect(explicit.scene.batches.some((batch) => batch.kind === "segments")).toBe(true);
    expect(explicit.warnings.some((warning) => warning.code === "removed-missing")).toBe(false);
  });

  it("preserves epoch-second source semantics through domains, stats, and rules", () => {
    const seconds = [900_000_000, 1_000_000_000, 1_100_000_000];
    const point = runPipeline(
      gg(
        seconds.map((when, index) => ({ when, value: index + 1 })),
        aes({ x: "when", y: "value" }),
      )
        .geomPoint()
        .geomRule({ xintercept: 1_050_000_000 })
        .geomRule({ xintercept: "1050000000" })
        .scaleXDatetime({
          parse: { epoch: "seconds" },
          domain: [900_000_000, 1_200_000_000],
          breaks: [1_000_000_000, 1_100_000_000],
          nice: false,
        })
        .spec(),
      size,
    );
    expect(point.scales.x.type).toBe("time");
    if (point.scales.x.type !== "band") {
      expect(point.scales.x.domain).toEqual([900_000_000_000, 1_200_000_000_000]);
    }
    expect(point.scene.axes.x.ticks).toHaveLength(2);
    const rules = point.scene.batches.filter((batch) => batch.kind === "segments");
    expect(rules).toHaveLength(2);
    if (rules[0]?.kind === "segments" && rules[1]?.kind === "segments") {
      expect(rules[0].segments[0]).toBeCloseTo(rules[1].segments[0]!, 5);
    }

    for (const stat of ["count", "summary"] as const) {
      const rows = seconds.map((when, index) => ({ when, value: index + 1 }));
      const layer =
        stat === "count"
          ? gg(rows, aes({ x: "when" })).geomBar()
          : gg(rows, aes({ x: "when", y: "value" })).geomErrorbar({ stat: "summary" });
      const model = runPipeline(
        layer.scaleXDatetime({ parse: { epoch: "seconds" }, nice: false }).spec(),
        size,
      );
      expect(model.scales.x.type).toBe("time");
      if (model.scales.x.type !== "band") {
        expect(model.scales.x.domain).toEqual([900_000_000_000, 1_100_000_000_000]);
      }
    }
  });

  it("fails explicit parsing by default and censors only when requested", () => {
    const rows = [
      { when: "31/12/2024", value: 1 },
      { when: "bad", value: 2 },
    ];
    const bad = gg(rows, aes({ x: "when", y: "value" }))
      .geomPoint()
      .scaleXDate({ parse: "dmy" })
      .spec();
    expect(() => runPipeline(bad, size)).toThrow(PipelineError);
    try {
      runPipeline(bad, size);
    } catch (error) {
      expect((error as PipelineError).code).toBe("temporal-parse-failed");
      expect((error as PipelineError).path).toBe("/scales/x/parse");
      expect((error as Error).message).toContain("1 value");
      const diagnostic = (error as PipelineError).diagnostic;
      expect(diagnostic?.code).toBe("temporal-parse-failed");
      expect(diagnostic?.severity).toBe("error");
      expect(diagnostic?.problem).toContain("1 value");
    }

    const censored = runPipeline(
      gg(rows, aes({ x: "when", y: "value" }))
        .geomPoint()
        .scaleXDate({ parse: "dmy", parseFailure: "censor" })
        .spec(),
      size,
    );
    expect(censored.warnings.some((warning) => warning.code === "temporal-values-censored")).toBe(
      true,
    );
  });

  it("validates the whole source column before runtime filters and facets", () => {
    const rows = [
      { when: "31/12/2024", value: 1, group: "keep" },
      { when: "bad", value: 2, group: "hide" },
    ];
    const spec = gg(rows, aes({ x: "when", y: "value" }))
      .geomPoint()
      .scaleXDate({ parse: "dmy" })
      .spec();
    expect(() =>
      runPipeline(spec, {
        ...size,
        rowFilters: [{ scale: "color", field: "group", mode: "exclude", values: ["hide"] }],
      }),
    ).toThrow(PipelineError);
  });

  it("exposes bounded decisions while preserving original source rows", () => {
    const model = runPipeline(
      gg(yearRows, aes({ x: "year", y: "value" }))
        .geomPoint()
        .spec(),
      size,
    );
    const decision = model.scaleDecisions.find(
      (candidate) => candidate.aesthetic === "x" && candidate.field === "year",
    );
    expect(decision).toMatchObject({
      aesthetic: "x",
      field: "year",
      status: "temporal",
      parser: "year",
      precision: "year",
      validatedCount: 3,
      portableOverride: { type: "time", temporalKind: "date", parse: "year" },
    });
    expect(model.row(0)).toEqual(yearRows[0]);
    expect(model.axisFormatters.x("1835")).toContain("1835");
  });
});
