import { describe, expect, it } from "bun:test";

import { aes, gg, SpecValidationError } from "@ggsvelte/spec";

import { PipelineError, runPipeline } from "../src/pipeline.ts";

const size = { width: 640, height: 400 };

const yearRows = [
  { year: "1835", value: 1 },
  { year: "1900", value: 2 },
  { year: "2026", value: 3 },
];

describe("temporal pipeline semantics", () => {
  it("exposes measured temporal GuidePlans at responsive extents", () => {
    for (const width of [320, 640, 1200]) {
      const model = runPipeline(
        gg(yearRows, aes({ x: "year", y: "value" }))
          .geomLine()
          .spec(),
        { width, height: 400 },
      );
      const guide = model.guidePlans.find((plan) => plan.aesthetic === "x");
      expect(model.guidePlans.map((plan) => plan.aesthetic).toSorted()).toEqual(["x", "y"]);
      expect(guide?.scaleType).toBe("time");
      expect(guide?.overlap, String(width)).toBe(false);
      expect(guide?.ticks.every((tick) => tick.fullLabel.length > 0)).toBe(true);
      expect(model.scaleDecisions[0]?.guidePlanIds).toContain(guide?.id);
      expect(model.scene.panels[0]?.axisX?.every((tick) => tick.kind === "major")).toBe(true);
    }
  });

  it("projects explicit major and minor temporal intervals separately", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-04-01", value: 2 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomLine()
        .scaleXDate({
          dateBreaks: "1 month",
          dateMinorBreaks: "1 week",
          dateLabels: "%Y-%m-%d",
        })
        .spec(),
      size,
    );
    const guide = model.guidePlans.find((plan) => plan.aesthetic === "x")!;
    expect(guide.source).toBe("interval");
    expect(guide.ticks.some((tick) => tick.kind === "minor")).toBe(true);
    expect(model.scene.panels[0]?.grid.minorX.length).toBeGreaterThan(0);
    expect(Object.hasOwn(model.scene.grid, "minorX")).toBe(false);
    expect(Object.hasOwn(model.scene.grid, "minorY")).toBe(false);
    const majorGrid = new Set(model.scene.panels[0]?.grid.x ?? []);
    expect((model.scene.panels[0]?.grid.minorX ?? []).every((value) => !majorGrid.has(value))).toBe(
      true,
    );
  });

  it("reports bounded explicit temporal intervals as structured pipeline errors", () => {
    expect(() =>
      runPipeline(
        gg(yearRows, aes({ x: "year", y: "value" }))
          .geomLine()
          .scaleXDate({ dateBreaks: "1 day" })
          .spec(),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        name: "PipelineError",
        code: "temporal-break-limit",
        path: "/scales/x/dateBreaks",
      }),
    );
  });

  it("keeps explicit temporal interval errors on their owning axis and option", () => {
    expect(() =>
      runPipeline(
        gg(
          [
            { x: "2024-01-01", y: "1900-01-01" },
            { x: "2024-01-03", y: "2025-01-01" },
          ],
          aes({ x: "x", y: "y" }),
        )
          .geomPoint()
          .scaleXDate({ dateBreaks: "1 day" })
          .scaleYDate({ dateBreaks: "1 day" })
          .spec(),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "temporal-break-limit",
        path: "/scales/y/dateBreaks",
      }),
    );

    expect(() =>
      runPipeline(
        gg(yearRows, aes({ x: "year", y: "value" }))
          .geomLine()
          .scaleXDate({ dateBreaks: "1 day", dateMinorBreaks: "1 day" })
          .spec(),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "temporal-break-limit",
        path: "/scales/x/dateBreaks",
      }),
    );

    expect(() =>
      runPipeline(
        gg(
          [
            { date: "2024-01-01", value: 1 },
            { date: "2024-12-31", value: 2 },
          ],
          aes({ x: "date", y: "value" }),
        )
          .geomLine()
          .scaleXDate({ dateBreaks: "1 year", dateMinorBreaks: "1 day" })
          .spec(),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "temporal-break-limit",
        path: "/scales/x/dateMinorBreaks",
      }),
    );
  });

  it("rejects temporal guides on explicitly non-time runtime scales", () => {
    for (const type of ["linear", "log"] as const) {
      let thrown: unknown;
      try {
        runPipeline(
          {
            edition: 2,
            data: {
              values: [
                { when: "2024-01-01", value: 1 },
                { when: "2024-01-03", value: 2 },
              ],
            },
            layers: [
              {
                geom: "point",
                stat: "identity",
                position: "identity",
                aes: { x: { field: "when" }, y: { field: "value" } },
              },
            ],
            scales: {
              x: { type, parse: "ymd", dateBreaks: "1 day", dateLabels: "%Y-%m-%d" },
            },
          },
          size,
        );
      } catch (error) {
        thrown = error;
      }
      expect(thrown, type).toBeInstanceOf(SpecValidationError);
      expect((thrown as SpecValidationError).errors, type).toEqual([
        {
          code: "scale-type-mismatch",
          path: "/scales/x",
          message: `scales.x uses temporal break or label options with explicit type "${type}".`,
          fix: {
            description:
              'Use type "time", a date/datetime scale helper, or remove the temporal option.',
          },
        },
      ]);
    }
  });

  it("plans intervals for parser-backed rowless time axes without fabricating decisions", () => {
    const model = runPipeline(
      {
        edition: 2,
        data: { values: [{ pad: 1 }] },
        layers: [
          {
            geom: "rule",
            stat: "identity",
            position: "identity",
            params: { xintercept: ["2024-01-01", "2024-01-10"] },
          },
        ],
        scales: {
          x: {
            type: "time",
            parse: "ymd",
            domain: ["2024-01-01", "2024-01-10"],
            dateBreaks: "3 days",
            nice: false,
          },
        },
      },
      size,
    );
    const guide = model.guidePlans.find((plan) => plan.aesthetic === "x")!;
    expect(guide.source).toBe("interval");
    expect(guide.temporalKind).toBe("date");
    expect(guide.interval).toBe("3 days");
    expect(guide.ticks.filter((tick) => tick.kind === "major").map((tick) => tick.value)).toEqual([
      Date.UTC(2024, 0, 3),
      Date.UTC(2024, 0, 6),
      Date.UTC(2024, 0, 9),
    ]);
    expect(model.scaleDecisions.filter((decision) => decision.aesthetic === "x")).toHaveLength(0);
  });

  it("preserves authored overlapping labels and emits a structured diagnostic", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-12-31", value: 2 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomLine()
        .scaleXDate({ dateBreaks: "1 month", dateLabels: "%Y-%m-%d" })
        .spec(),
      { width: 120, height: 240 },
    );
    const labels = model.scene.panels[0]?.axisX?.map((tick) => tick.label) ?? [];
    expect(labels).toContain("2024-01-01");
    expect(labels.some((label) => label.includes("…"))).toBe(false);
    expect(
      model.scaleDiagnostics.some((diagnostic) => diagnostic.code === "temporal-label-overlap"),
    ).toBe(true);
  });

  it("preserves labels and reports margin overflow separately from overlap", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-02-01", value: 2 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomLine()
        .scaleXDate({ dateBreaks: "1 month", dateLabels: "%A %B %Y-%m-%d" })
        .spec(),
      { width: 120, height: 240 },
    );
    const labels = model.scene.panels[0]?.axisX?.map((tick) => tick.label) ?? [];
    expect(labels).toEqual(["Monday January 2024-01-01", "Thursday February 2024-02-01"]);
    expect(labels.every((label) => !label.includes("…"))).toBe(true);
    expect(
      model.scaleDiagnostics.some(
        (diagnostic) => diagnostic.code === "temporal-label-margin-overflow",
      ),
    ).toBe(true);
  });

  it("applies explicit temporal precedence and reports ignored shorthand", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-04-01", value: 2 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomLine()
        .scaleXDate({
          breaks: ["2024-01-01", "2024-04-01"],
          dateBreaks: "1 month",
          labels: "%Y",
          dateLabels: "%b",
        })
        .spec(),
      size,
    );
    const guide = model.guidePlans.find((plan) => plan.aesthetic === "x")!;
    expect(guide.source).toBe("explicit");
    expect(guide.interval).toBeNull();
    expect(guide.ticks.map((tick) => tick.label)).toEqual(["Jan", "Apr"]);
    expect(model.warnings.filter((warning) => warning.code === "unused-scale-option")).toHaveLength(
      2,
    );
  });

  it("retains explicit source breaks and diagnoses out-of-domain values", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-04-01", value: 2 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomLine()
        .scaleXDate({
          domain: ["2024-01-01", "2024-04-01"],
          breaks: ["2023-12-01", "2024-01-01", "2024-05-01"],
        })
        .spec(),
      size,
    );
    const guide = model.guidePlans.find((plan) => plan.aesthetic === "x")!;
    expect(guide.sourceBreaks).toEqual(["2023-12-01", "2024-01-01", "2024-05-01"]);
    expect(guide.ticks.filter((tick) => tick.kind === "major")).toHaveLength(1);
    expect(
      model.scaleDiagnostics.some(
        (diagnostic) => diagnostic.code === "temporal-break-outside-domain",
      ),
    ).toBe(true);
  });

  it("does not misreport duplicate in-domain breaks as outside the domain", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-04-01", value: 2 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomLine()
        .scaleXDate({ breaks: ["2024-01-01", "2024-01-01", "2024-04-01"] })
        .spec(),
      size,
    );
    const guide = model.guidePlans.find((plan) => plan.aesthetic === "x")!;
    expect(guide.ticks.filter((tick) => tick.kind === "major")).toHaveLength(3);
    expect(
      model.scaleDiagnostics.some(
        (diagnostic) => diagnostic.code === "temporal-break-outside-domain",
      ),
    ).toBe(false);
  });

  it("rejects unparseable explicit breaks instead of misreporting them as out of domain", () => {
    expect(() =>
      runPipeline(
        gg(
          [
            { date: "2024-01-01", value: 1 },
            { date: "2024-04-01", value: 2 },
          ],
          aes({ x: "date", y: "value" }),
        )
          .geomLine()
          .scaleXDate({ breaks: ["2024-01-01", "not-a-date"] })
          .spec(),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "invalid-scale-breaks",
        path: "/scales/x/breaks",
      }),
    );
  });

  it("keeps semantic temporal plans ascending under reverse and coord flip", () => {
    const model = runPipeline(
      gg(yearRows, aes({ x: "year", y: "value" }))
        .geomLine()
        .scaleXDate({ reverse: true })
        .coordFlip()
        .spec(),
      size,
    );
    const guide = model.guidePlans.find((plan) => plan.aesthetic === "x")!;
    const values = guide.ticks
      .filter((tick) => tick.kind === "major")
      .map((tick) => tick.value as number);
    expect(values).toEqual([...values].toSorted((left, right) => left - right));
    expect(guide.direction).toBe("descending");
    expect(model.scene.panels[0]?.axisY?.map((tick) => tick.label)).toEqual(
      guide.ticks.filter((tick) => tick.kind === "major").map((tick) => tick.label),
    );
  });

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

  it("renders builder Date cells through an explicit calendar scale", () => {
    const model = runPipeline(
      gg(
        [
          { when: new Date("2024-01-01T00:00:00.000Z"), value: 1 },
          { when: new Date("2024-01-02T00:00:00.000Z"), value: 2 },
        ],
        aes({ x: "when", y: "value" }),
      )
        .geomLine()
        .scaleXDate({ parse: "iso", nice: false })
        .spec(),
      size,
    );

    expect(model.scales.x.type).toBe("time");
    expect(model.scales.x.domain).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 2)]);
  });

  it("renders every identity geometry on an explicit discrete y scale", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { x: 1, category: "low", label: "L" },
            { x: 2, category: "high", label: "H" },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "category" } },
          },
          {
            geom: "line",
            aes: { x: { field: "x" }, y: { field: "category" } },
          },
          {
            geom: "text",
            aes: {
              x: { field: "x" },
              y: { field: "category" },
              label: { field: "label" },
            },
          },
          { geom: "rule", aes: { y: { field: "category" } } },
        ],
        scales: { y: { type: "band" } },
      },
      size,
    );
    expect(model.scales.y.type).toBe("band");
    expect(model.scene.batches.map(({ kind }) => kind)).toEqual([
      "points",
      "paths",
      "glyphs",
      "segments",
    ]);
  });

  it("maps temporal strings through a sequential color scale", () => {
    const model = runPipeline(
      gg(yearRows, aes({ x: "value", y: "value", color: "year" }))
        .geomPoint()
        .spec(),
      size,
    );
    const resolved = model.scales.color;
    expect(resolved?.kind).toBe("sequential");
    if (resolved?.kind !== "sequential") throw new Error("unreachable");
    expect(resolved.scale.domain).toEqual([Date.UTC(1835, 0, 1), Date.UTC(2026, 0, 1)]);
    expect(resolved.scale.colorOf("1835")).toMatch(/^#[0-9a-f]{6}$/);
    expect(resolved.scale.colorOf("1835")).not.toBe(resolved.scale.colorOf("2026"));
    const legend = model.scene.legends.find(
      (candidate) => candidate.type === "ramp" && candidate.scale === "color",
    );
    if (legend?.type !== "ramp") throw new Error("expected temporal ramp legend");
    expect(legend.ticks.map(({ label }) => label)).toEqual(["1850", "1900", "1950", "2000"]);

    const pinned = runPipeline(
      gg(yearRows, aes({ x: "value", y: "value", color: "year" }))
        .geomPoint()
        .scales({ color: { type: "sequential", domain: ["1835", "2026"] } })
        .spec(),
      size,
    ).scales.color;
    expect(pinned?.kind).toBe("sequential");
    if (pinned?.kind !== "sequential") throw new Error("expected pinned temporal color scale");
    expect(pinned.scale.domain).toEqual([Date.UTC(1835, 0, 1), Date.UTC(2026, 0, 1)]);
  });

  it("groups inferred temporal strings when color is explicitly ordinal", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1, year: "2024" },
          { x: 2, y: 2, year: "2024" },
          { x: 1, y: 3, year: "2025" },
          { x: 2, y: 4, year: "2025" },
        ],
        aes({ x: "x", y: "y", color: "year" }),
      )
        .geomLine()
        .scales({ color: { type: "ordinal" } })
        .spec(),
      size,
    );

    expect(model.scales.color?.kind).toBe("ordinal");
    const paths = model.scene.batches.find((batch) => batch.kind === "paths");
    expect(paths?.kind).toBe("paths");
    if (paths?.kind !== "paths") throw new Error("expected grouped paths");
    expect([...paths.pathOffsets]).toEqual([0, 2, 4]);
  });

  for (const type of ["linear", "log"] as const) {
    it(`keeps numeric string years quantitative under an explicit ${type} scale`, () => {
      const model = runPipeline(
        gg(yearRows, aes({ x: "year", y: "value" }))
          .geomLine()
          .scales({ x: { type, nice: false } })
          .spec(),
        size,
      );

      expect(model.scales.x.type).toBe(type);
      expect(model.scales.x.domain).toEqual([1835, 2026]);
      expect(model.scaleDecisions).toHaveLength(0);
    });
  }

  it("lets an explicit discrete scale override string-year inference", () => {
    const model = runPipeline(
      gg(yearRows, aes({ x: "year", y: "value" }))
        .geomLine()
        .scaleXDiscrete({ breaks: ["1835", "2026"] })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("band");
    if (model.scales.x.type === "band")
      expect(model.scales.x.domain).toEqual(["1835", "1900", "2026"]);
    expect(model.scene.axes.x.ticks.map(({ label }) => label)).toEqual(["1835", "2026"]);
    expect(model.scene.axes.x.ticks[1]!.pos).toBeGreaterThan(model.scene.panels[0]!.width * 0.7);
    const line = model.scene.batches.find((batch) => batch.kind === "paths");
    if (line?.kind === "paths") expect([...line.pathOffsets]).toEqual([0, 1, 2, 3]);
    expect(model.scaleDecisions).toHaveLength(0);
  });

  it("positions reordered typed band breaks by domain identity", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { category: 1, value: 1 },
            { category: "1", value: 2 },
            { category: 2, value: 3 },
          ],
        },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "category" }, y: { field: "value" } },
          },
        ],
        scales: { x: { type: "band", breaks: [2, 1] } },
      },
      size,
    );
    expect(model.scene.axes.x.ticks.map(({ label }) => label)).toEqual(["2", "1"]);
    expect(model.scene.axes.x.ticks[0]!.pos).toBeGreaterThan(model.scene.axes.x.ticks[1]!.pos);
    if (model.scales.x.type === "band") {
      expect(model.scales.x.rawDomain).toEqual([1, "1", 2]);
    }
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

  it("keeps calendar-date parsers on UTC dates even when a timezone is configured", () => {
    const model = runPipeline(
      gg(
        [
          { year: "2024", value: 1 },
          { year: "2025", value: 2 },
        ],
        aes({ x: "year", y: "value" }),
      )
        .geomLine()
        .scaleXDate({ timezone: "Asia/Tokyo", nice: false })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("time");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)]);
    }
    expect(model.axisFormatters.x("2024")).toContain("2024");
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
    const facetGuides = model.guidePlans.filter((plan) => plan.aesthetic === "x");
    expect(facetGuides).toHaveLength(2);
    expect(facetGuides.every((plan) => plan.interval !== null && !plan.overlap)).toBe(true);
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

    const equivalentSpellings = runPipeline(
      gg([{ when: "1/2/2025" }, { when: "01/02/2025" }], aes({ x: "when" }))
        .geomBar()
        .scaleXDate({ parse: "dmy", nice: false })
        .spec(),
      size,
    );
    expect(equivalentSpellings.scales.y.domain).toEqual([0, 2]);
  });

  it("rejects invalid annotations after mapped data infers a temporal parser", () => {
    expect(() =>
      runPipeline(
        gg(yearRows, aes({ x: "year", y: "value" }))
          .geomPoint()
          .geomRule({ xintercept: "bad" })
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
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
    expect(point.axisFormatters.x(1_000_000_000)).toBe(point.axisFormatters.x(1_000_000_000_000));
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

  it("rejects date/datetime kind mismatches", () => {
    const rows = [
      { when: "2025-01-01T10:30:00", value: 1 },
      { when: "2025-01-02T10:30:00", value: 2 },
    ];
    expect(() =>
      runPipeline(
        gg(rows, aes({ x: "when", y: "value" }))
          .geomLine()
          .scaleXDate({ parse: "ymd_hms" })
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
    expect(() =>
      runPipeline(
        gg([rows[0]!, { when: "not-a-date", value: 2 }], aes({ x: "when", y: "value" }))
          .geomLine()
          .scaleXDate({ parse: "ymd_hms", parseFailure: "censor" })
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
  });

  it("infers temporal y scales from identity bounds", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { x: "a", lo: "2024-01-01", hi: "2024-01-03" },
            { x: "b", lo: "2024-02-01", hi: "2024-02-03" },
          ],
        },
        layers: [
          {
            geom: "errorbar",
            aes: { x: { field: "x" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
          },
        ],
      },
      size,
    );
    expect(model.scales.y.type).toBe("time");
    expect(model.scaleDecisions.map(({ field }) => field)).toEqual(["lo", "hi"]);
  });

  it("keeps independent auto-parser decisions for mixed temporal bound formats", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { x: "a", lo: "2024-01-01", hi: "31/01/2024" },
            { x: "b", lo: "2024-02-01", hi: "29/02/2024" },
          ],
        },
        layers: [
          {
            geom: "errorbar",
            aes: { x: { field: "x" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
          },
        ],
      },
      size,
    );
    expect(model.scales.y.type).toBe("time");
    expect(model.scaleDecisions.map(({ parser }) => parser)).toEqual(["iso", "dmy"]);

    expect(() =>
      runPipeline(
        {
          data: {
            values: [
              { x: "a", lo: "2024-01-01", hi: "31/01/2024" },
              { x: "b", lo: "2024-02-01", hi: "29/02/2024" },
            ],
          },
          layers: [
            {
              geom: "errorbar",
              aes: { x: { field: "x" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
            },
            { geom: "rule", params: { yintercept: "not-a-date" } },
          ],
        },
        size,
      ),
    ).toThrow(PipelineError);
  });

  it("preflights requested temporal annotation intercepts", () => {
    const semantic = runPipeline(
      {
        data: { values: [{}] },
        layers: [{ geom: "rule", params: { yintercept: Date.UTC(2025, 0, 1) } }],
        scales: { y: { type: "time" } },
      },
      size,
    );
    expect(semantic.scene.batches.some(({ kind }) => kind === "segments")).toBe(true);

    const spec = {
      data: { values: [{}] },
      layers: [{ geom: "rule" as const, params: { yintercept: "not-a-date" } }],
      scales: { y: { type: "time" as const, parse: "dmy" as const } },
    };
    expect(() => runPipeline(spec, size)).toThrow(PipelineError);
    const censored = runPipeline(
      { ...spec, scales: { y: { ...spec.scales.y, parseFailure: "censor" } } },
      size,
    );
    expect(censored.scene.batches).toHaveLength(0);
    expect(censored.warnings.some(({ code }) => code === "temporal-values-censored")).toBe(true);

    expect(() =>
      runPipeline(
        {
          data: { values: [{}] },
          layers: [
            {
              geom: "rule",
              params: { yintercept: ["2025-01-01 10:30:00", "bad"] },
            },
          ],
          scales: {
            y: {
              type: "time",
              parse: "ymd_hms",
              temporalKind: "date",
              parseFailure: "censor",
            },
          },
        },
        size,
      ),
    ).toThrow(PipelineError);

    const mixed = runPipeline(
      {
        data: { values: [{}] },
        layers: [{ geom: "rule", params: { yintercept: [Date.UTC(2025, 0, 1), "bad"] } }],
        scales: { y: { type: "time", parse: "dmy", parseFailure: "censor" } },
      },
      size,
    );
    expect(
      mixed.warnings.find(({ code }) => code === "temporal-values-censored")?.message,
    ).toContain("censored 1 annotation");
  });

  it("rejects invalid temporal configuration without source rows", () => {
    expect(() =>
      runPipeline(
        {
          data: { values: [] },
          layers: [{ geom: "point" }],
          scales: {
            x: {
              type: "time",
              parse: { format: "%Y-%m-Q%q" },
              parseFailure: "censor",
            },
          },
        },
        size,
      ),
    ).toThrow(PipelineError);
  });

  it("preflights locale and dateLabels into stable structured pipeline errors", () => {
    for (const [config, code, path] of [
      [{ locale: "not_a_locale" }, "invalid-temporal-locale", "/scales/x/locale"],
      [{ dateLabels: "%Q" }, "invalid-temporal-labels", "/scales/x/dateLabels"],
    ] as const) {
      try {
        runPipeline(
          {
            data: { values: [] },
            layers: [{ geom: "point" }],
            scales: { x: { type: "time", ...config } },
          },
          size,
        );
        throw new Error("expected temporal configuration to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(PipelineError);
        if (!(error instanceof PipelineError)) throw error;
        expect(error.code).toBe(code);
        expect(error.path).toBe(path);
        expect(error.diagnostic).toMatchObject({ code, path, severity: "error" });
        expect(error.diagnostic?.problem.length).toBeGreaterThan(0);
        expect(error.diagnostic?.cause.length).toBeGreaterThan(0);
        expect(error.diagnostic?.fixes.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps ambiguous y-intercept annotations discrete", () => {
    const model = runPipeline(
      {
        data: { values: [{}] },
        layers: [{ geom: "rule", params: { yintercept: "03/04/2024" } }],
      },
      size,
    );
    expect(model.scales.y.type).toBe("band");
  });

  it("preflights explicit parsers against temporal bound fields", () => {
    const spec = {
      data: {
        values: [
          { x: 1, ymin: "31/12/2024", ymax: "bad" },
          { x: 2, ymin: "01/01/2025", ymax: "02/01/2025" },
        ],
      },
      layers: [
        {
          geom: "errorbar" as const,
          aes: {
            x: { field: "x" },
            ymin: { field: "ymin" },
            ymax: { field: "ymax" },
          },
        },
      ],
      scales: { y: { type: "time" as const, parse: "dmy" as const } },
    };
    expect(() => runPipeline(spec, size)).toThrow(PipelineError);
    try {
      runPipeline(spec, size);
    } catch (error) {
      expect((error as PipelineError).code).toBe("temporal-parse-failed");
      expect((error as Error).message).toContain('field "ymax"');
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

  it("preflights the source column even when runtime filters remove every row", () => {
    expect(() =>
      runPipeline(
        {
          data: { values: [{ when: "not-a-date", value: 1, group: "drop" }] },
          layers: [
            {
              geom: "point",
              aes: { x: { field: "when" }, y: { field: "value" } },
            },
          ],
          scales: { x: { type: "time", parse: "dmy" } },
        },
        {
          ...size,
          rowFilters: [{ scale: "color", field: "group", mode: "exclude", values: ["drop"] }],
        },
      ),
    ).toThrow(PipelineError);
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
    expect(model.axisFormatters.x("1835")).toBe("1835-01-01");
    expect(Object.isFrozen(model.guidePlans)).toBe(true);
  });
});
