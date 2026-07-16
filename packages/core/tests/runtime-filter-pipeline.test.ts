import { describe, expect, test } from "bun:test";

import { runPipeline } from "../src/pipeline.ts";

const size = { width: 480, height: 320 };
const rows = [
  { id: "a", group: "west", x: 1, y: 2 },
  { id: "b", group: "east", x: 2, y: 4 },
  { id: "c", group: "west", x: 3, y: 6 },
] as const;

const spec = {
  data: { values: rows },
  aes: { x: "x", y: "y", color: "group" },
  layers: [{ geom: "point" as const }],
};

describe("runPipeline runtime row filters", () => {
  test("filters before facets, stats, scales, candidates, and rendering", () => {
    const model = runPipeline(
      { ...spec, facet: { wrap: { field: "group" } } },
      {
        ...size,
        rowFilters: [{ scale: "color", field: "group", mode: "exclude", values: ["east"] }],
      },
    );

    expect(model.scene.panels).toHaveLength(1);
    expect(model.scene.panels[0]?.strip).toBe("west");
    expect(model.candidates.size).toBe(2);
  });

  test("preserves original source row indexes and row lookup", () => {
    const model = runPipeline(spec, {
      ...size,
      rowFilters: [{ scale: "color", field: "group", mode: "exclude", values: ["west"] }],
    });
    const candidate = model.candidates.candidate(0);

    expect(candidate?.rowIndex).toBe(1);
    expect(model.row(candidate?.rowIndex ?? -1)?.id).toBe("b");
    expect(model.lineage.keys(candidate?.lineage ?? -1)).toEqual([1]);
  });

  test("keeps the complete categorical legend and color assignments stable", () => {
    const initial = runPipeline(spec, size);
    const before = initial.scene.legends[0];
    expect(before?.type).toBe("discrete");

    const filtered = runPipeline(spec, {
      ...size,
      prevScales: initial.scales.state,
      rowFilters: [{ scale: "color", field: "group", mode: "exclude", values: ["east"] }],
    });
    const during = filtered.scene.legends[0];
    expect(during?.type).toBe("discrete");
    if (before?.type !== "discrete" || during?.type !== "discrete") return;

    expect(during.entries.map((entry) => entry.value)).toEqual(
      before.entries.map((entry) => entry.value),
    );
    expect(during.entries.map((entry) => entry.color)).toEqual(
      before.entries.map((entry) => entry.color),
    );
  });

  test("applies equally to named runtime datasets", () => {
    const model = runPipeline(
      {
        data: { name: "points" },
        aes: { x: "x", y: "y", color: "group" },
        layers: [{ geom: "point" }],
      },
      {
        ...size,
        data: { points: rows },
        rowFilters: [{ scale: "color", field: "group", mode: "include", values: ["east"] }],
      },
    );

    expect(model.candidates.size).toBe(1);
    expect(model.row(model.candidates.candidate(0)?.rowIndex ?? -1)?.id).toBe("b");
  });

  test("keeps a recoverable legend when filters remove every row", () => {
    const model = runPipeline(spec, {
      ...size,
      rowFilters: [
        {
          scale: "color",
          field: "group",
          mode: "exclude",
          values: ["west", "east"],
        },
      ],
    });
    const legend = model.scene.legends[0];

    expect(model.candidates.size).toBe(0);
    expect(model.warnings).toContainEqual(expect.objectContaining({ code: "empty-data" }));
    expect(legend?.type).toBe("discrete");
    if (legend?.type === "discrete")
      expect(legend.entries.map((entry) => entry.value)).toEqual(["west", "east"]);
  });

  test("filters before count stats, positional scale training, and axis layout", () => {
    const countSpec = {
      data: { values: rows },
      aes: { x: "group" },
      layers: [{ geom: "bar" as const }],
    };
    const initial = runPipeline(countSpec, size);
    const filtered = runPipeline(countSpec, {
      ...size,
      rowFilters: [{ scale: "fill", field: "group", mode: "exclude", values: ["west"] }],
    });

    expect(initial.scales.x.type).toBe("band");
    expect(filtered.scales.x.type).toBe("band");
    if (initial.scales.x.type === "band" && filtered.scales.x.type === "band") {
      expect(initial.scales.x.domain).toEqual(["west", "east"]);
      expect(filtered.scales.x.domain).toEqual(["east"]);
    }
    expect(initial.scales.y.type).toBe("linear");
    expect(filtered.scales.y.type).toBe("linear");
    if (initial.scales.y.type !== "band" && filtered.scales.y.type !== "band")
      expect(filtered.scales.y.domain[1]).toBeLessThan(initial.scales.y.domain[1]);
    expect(filtered.scene.panels[0]?.axisX?.map((tick) => tick.label)).toEqual(["east"]);
  });
});
