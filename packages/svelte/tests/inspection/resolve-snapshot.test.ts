import { describe, expect, it, vi } from "vitest";

import { registerAll, runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

// Temporal spec-driven suite (#1420): no components to self-register, and
// the lane setup skips Temporal deliberately — install the full grammar here.
registerAll();

import { formatTooltipCell } from "../../src/lib/inspection/display-members.js";
// Barrel path characterization: production + tests historically import via resolver.js
import {
  materializeInspection,
  resolveInspection,
  resolvedTarget,
  selectTransientMembers,
  TRANSIENT_MEMBER_LIMIT,
} from "../../src/lib/inspection/resolver.js";

describe("inspection snapshot resolve", () => {
  it("uses one core grouped target for focus, legend order, fields, and lineage", () => {
    const data = [
      { id: "a1", x: 1, y: 3, series: "a" },
      { id: "b1", x: 1, y: 7, series: "b" },
      { id: "a2", x: 2, y: 4, series: "a" },
      { id: "b2", x: 2, y: 8, series: "b" },
    ];
    const spec = gg(data, aes({ x: "x", y: "y", color: "series" }))
      .geomLine()
      .spec();
    const model = runPipeline(spec, { width: 480, height: 320 });
    const seed = model.candidates.candidate(0)!;
    const inspection = resolveInspection({
      model,
      seed,
      mode: "x",
      state: "transient",
      source: "pointer",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.mode).toBe("x");
    expect(inspection.axisValue).toBe(1);
    expect(inspection.members).toHaveLength(2);
    expect(inspection.members.map((member) => member.key)).toEqual(["a1", "b1"]);
    expect(inspection.members).toContain(inspection.focus);
    expect(inspection.focus.lineageCount).toBe(1);
    model.dispose();
  });
  it("falls back to a single-member snapshot when axis grouping has no bucket", () => {
    const model = runPipeline(
      gg([{ id: "a", x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 300, height: 200 },
    );
    const seed = model.candidates.candidate(0)!;
    // group() owns bucket validity; force a null group so resolveInspection's
    // total fallback materializes a single-member axis snapshot.
    vi.spyOn(model.candidates, "group").mockReturnValue(null);
    const inspection = resolveInspection({
      model,
      seed: { ...seed, xValue: null, yValue: null },
      mode: "x",
      state: "pinned",
      source: "keyboard",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.mode).toBe("x");
    expect(inspection.members).toHaveLength(1);
    expect(inspection.focus.key).toBe("a");
    expect(inspection.axisValue).toBeNull();
    expect(inspection.axisLabel).toBe("–");
    model.dispose();
  });
  it("dedups aggregate sourceKeys in first-seen order and skips null keyOf results", () => {
    // keyOf maps: skip → null, a2 → "a", b2 → "b", else id.
    // Unique non-null keys are {a,b,c}; order follows first lineage appearance.
    const data = [
      { id: "a", g: "g" },
      { id: "skip", g: "g" },
      { id: "b", g: "g" },
      { id: "a2", g: "g" },
      { id: "c", g: "g" },
      { id: "b2", g: "g" },
    ];
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const keyOf = (row: { id: string }): string | null => {
      if (row.id === "skip") return null;
      if (row.id === "a2") return "a";
      if (row.id === "b2") return "b";
      return row.id;
    };
    // Oracle: first-seen non-null keys along the published lineage order.
    const firstSeen: string[] = [];
    for (const rowIndex of model.lineage.keys(seed.lineage)) {
      const row = model.row(rowIndex) as { id: string } | null;
      if (row === null) continue;
      const key = keyOf(row);
      if (key !== null && !firstSeen.includes(key)) firstSeen.push(key);
    }
    expect(new Set(firstSeen)).toEqual(new Set(["a", "b", "c"]));
    expect(firstSeen).toHaveLength(3);

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: (row) => keyOf(row as { id: string }),
    });
    expect(inspection.focus.sourceKeys).toEqual(firstSeen);
    expect(inspection.focus.lineageCount).toBe(6);
    model.dispose();
  });
  it("materializes all-unique large lineage sourceKeys in first-seen order", () => {
    const n = 2_000;
    const data = Array.from({ length: n }, (_, index) => ({
      id: `row-${index}`,
      g: "g",
    }));
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(model.lineage.count(seed.lineage)).toBe(n);
    const lineageRows = model.lineage.keys(seed.lineage);
    const firstId = (model.row(lineageRows[0]) as { id: string }).id;
    const lastId = (model.row(lineageRows[n - 1]) as { id: string }).id;

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.focus.sourceKeys).toHaveLength(n);
    expect(inspection.focus.sourceKeys[0]).toBe(firstId);
    expect(inspection.focus.sourceKeys[n - 1]).toBe(lastId);
    model.dispose();
  });
  it("allocates a membership Set when materializing aggregate sourceKeys", () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `row-${index}`,
      g: "g",
    }));
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const RealSet = globalThis.Set;
    let constructions = 0;
    globalThis.Set = class CountingSet<T> extends RealSet<T> {
      constructor(iterable?: Iterable<T>) {
        super(iterable);
        constructions += 1;
      }
    } as SetConstructor;
    try {
      const inspection = resolveInspection({
        model,
        seed,
        mode: "exact",
        state: "transient",
        source: "pointer",
        keyOf: (row) => row.id as string,
      });
      expect(inspection.focus.sourceKeys).toHaveLength(40);
      expect(constructions).toBeGreaterThanOrEqual(1);
    } finally {
      globalThis.Set = RealSet;
      model.dispose();
    }
  });

  it("formats stat-layer temporal position fields with axis formatters (#1113)", () => {
    // Binned median over a date axis has no source row — candidate.xValue is
    // epoch ms. The axis header already formats it; default field rows must too.
    const data = [
      { date: "2000-05-01", y: 10 },
      { date: "2000-05-15", y: 20 },
      { date: "2000-06-01", y: 30 },
      { date: "2000-06-15", y: 40 },
    ];
    const model = runPipeline(
      gg(data, aes({ x: "date", y: "y" }))
        .geomLine({ stat: "summary_bin", fun: "median", bins: 4 })
        .spec(),
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(seed.rowIndex).toBeNull();
    expect(typeof seed.xValue).toBe("number");
    expect(seed.xValue).toBeGreaterThan(1e11); // epoch ms, not a calendar year

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: () => null,
    });
    expect(inspection.focus.row).toBeNull();
    const xField = inspection.focus.fields.find((field) => field.channel === "x");
    expect(xField).toBeDefined();
    expect(xField!.value).toBe(seed.xValue);

    // Plain cell path still dumps the epoch — the bug before the formatter route.
    expect(formatTooltipCell(xField!.value)).toBe(String(seed.xValue));
    // With axis formatters (Tooltip / live-text path), match the axis header.
    const formatted = formatTooltipCell(xField!.value, {
      channel: "x",
      axisFormatters: model.axisFormatters,
    });
    expect(formatted).toBe(model.axisFormatters.x(seed.xValue));
    expect(formatted).not.toBe(String(seed.xValue));
    expect(formatted).toMatch(/2000/);
    model.dispose();
  });

  it("recovers fill and weight from lineage for single-row stat bars (#1526)", () => {
    // geom_bar + weight: candidates are aggregates (rowIndex null) but lineage
    // still points at the source row that holds fill identity and weight.
    const model = runPipeline(
      {
        data: {
          values: [
            { track: "1876", level: "Berks", deaths: 175 },
            { track: "1876", level: "Herts", deaths: 174 },
          ],
        },
        layers: [
          {
            geom: "bar",
            position: "dodge",
            aes: {
              x: { field: "track" },
              fill: { field: "level" },
              weight: { field: "deaths" },
            },
          },
        ],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(seed.rowIndex).toBeNull();
    expect(seed.yValue).toBe(175);
    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: () => null,
    });
    const byChannel = Object.fromEntries(
      inspection.focus.fields.map((field) => [field.channel, field.value]),
    );
    expect(byChannel.fill).toBe("Berks");
    expect(byChannel.weight).toBe(175);
    expect(byChannel.y).toBe(175);
    model.dispose();
  });

  it("recovers group-constant fill from multi-row bar lineage (#1526)", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { track: "1876", level: "Berks" },
            { track: "1876", level: "Berks" },
            { track: "1876", level: "Herts" },
          ],
        },
        layers: [
          {
            geom: "bar",
            position: "dodge",
            aes: {
              x: { field: "track" },
              fill: { field: "level" },
            },
          },
        ],
      },
      { width: 400, height: 300 },
    );
    // Berks bar aggregates two rows; fill is still the series identity.
    const berks = [...Array(model.candidates.size).keys()]
      .map((id) => model.candidates.candidate(id)!)
      .find((c) => c.yValue === 2)!;
    expect(berks.rowIndex).toBeNull();
    expect(model.lineage.count(berks.lineage)).toBe(2);
    const inspection = resolveInspection({
      model,
      seed: berks,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: () => null,
    });
    const fill = inspection.focus.fields.find((f) => f.channel === "fill");
    expect(fill?.value).toBe("Berks");
    model.dispose();
  });

  it("does not invent a weight when multi-row lineage weights differ (#1526)", () => {
    // Prefer y (the aggregate) over a single arbitrary source weight.
    const model = runPipeline(
      {
        data: {
          values: [
            { track: "1876", level: "Berks", deaths: 100 },
            { track: "1876", level: "Berks", deaths: 75 },
          ],
        },
        layers: [
          {
            geom: "bar",
            aes: {
              x: { field: "track" },
              fill: { field: "level" },
              weight: { field: "deaths" },
            },
          },
        ],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(seed.rowIndex).toBeNull();
    expect(model.lineage.count(seed.lineage)).toBe(2);
    expect(seed.yValue).toBe(175);
    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: () => null,
    });
    const byChannel = Object.fromEntries(
      inspection.focus.fields.map((field) => [field.channel, field.value]),
    );
    expect(byChannel.fill).toBe("Berks");
    expect(byChannel.weight).toBeNull();
    expect(byChannel.y).toBe(175);
    model.dispose();
  });

  it("reads non-position candidate channels when the seed has no source row", () => {
    // Stat bins have null rowIndex; tooltip fields must still surface size /
    // linewidth / alpha / shape / linetype from the candidate bag, and map
    // unknown channels to null.
    const data = [
      { date: "2000-05-01", y: 10, s: 1 },
      { date: "2000-05-15", y: 20, s: 2 },
      { date: "2000-06-01", y: 30, s: 3 },
      { date: "2000-06-15", y: 40, s: 4 },
    ];
    const model = runPipeline(
      gg(data, aes({ x: "date", y: "y", size: "s" }))
        .geomPoint({ stat: "summary_bin", fun: "median", bins: 4 })
        .spec(),
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(seed.rowIndex).toBeNull();
    // Publish every non-position channel the candidateValue switch handles.
    const seedWithChannels = {
      ...seed,
      sizeValue: 4,
      linewidthValue: 1.5,
      alphaValue: 0.4,
      shapeValue: "circle",
      linetypeValue: "dashed",
    };
    // Force layerFields to include each channel (plus an unknown one for null).
    Object.defineProperty(model, "layerFields", {
      value: [
        [
          { channel: "size", field: "s" },
          { channel: "linewidth", field: "lw" },
          { channel: "alpha", field: "a" },
          { channel: "shape", field: "sh" },
          { channel: "linetype", field: "lt" },
          { channel: "fill", field: "f" },
        ],
      ],
    });
    const inspection = resolveInspection({
      model,
      seed: seedWithChannels,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: () => null,
    });
    expect(inspection.focus.row).toBeNull();
    const byChannel = Object.fromEntries(
      inspection.focus.fields.map((field) => [field.channel, field.value]),
    );
    expect(byChannel).toMatchObject({
      size: 4,
      linewidth: 1.5,
      alpha: 0.4,
      shape: "circle",
      linetype: "dashed",
      fill: null,
    });
    model.dispose();
  });
});

describe("selectTransientMembers top-k by value (#1274)", () => {
  it("keeps stack order when the group fits in the hover limit", () => {
    const data = Array.from({ length: 5 }, (_, index) => ({
      id: `s${index}`,
      x: 1,
      y: index + 1,
      series: `s${index}`,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "series" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const target = resolvedTarget(model, seed, "x")!;
    const selected = selectTransientMembers(target.members, seed.id, {
      groupAxis: "x",
      limit: TRANSIENT_MEMBER_LIMIT,
    });
    expect(selected.map((c) => c.id)).toEqual(target.members.map((c) => c.id));
    model.dispose();
  });

  it("fills non-focus slots with the largest |y| values and always includes focus", () => {
    // Stacking/group order is small→large (y = index+1). Focus the tiny first
    // series so without top-k the hover window would be the eight smallest.
    const data = Array.from({ length: 20 }, (_, index) => ({
      id: `s${index}`,
      x: 1,
      y: index + 1,
      series: `s${index}`,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "series" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const focus = model.candidates.candidate(0)!; // y = 1
    expect(focus.yValue).toBe(1);
    const target = resolvedTarget(model, focus, "x")!;
    expect(target.members.length).toBe(20);

    const selected = selectTransientMembers(target.members, focus.id, {
      groupAxis: "x",
      limit: TRANSIENT_MEMBER_LIMIT,
    });
    expect(selected).toHaveLength(TRANSIENT_MEMBER_LIMIT);
    expect(selected.some((c) => c.id === focus.id)).toBe(true);
    // Non-focus slots: y = 20..14 (largest seven). Focus (y=1) is force-included.
    // Prefer .sort over .toSorted here: this package's TS lib target does not
    // declare Array#toSorted (oxlint type-aware treats it as error).
    const nonFocusYs = selected.filter((c) => c.id !== focus.id).map((c) => Number(c.yValue));
    nonFocusYs.sort((a, b) => b - a);
    expect(nonFocusYs).toEqual([20, 19, 18, 17, 16, 15, 14]);
    model.dispose();
  });

  it("materializeInspection transient path uses top-k selection, not first-N stack order", () => {
    const data = Array.from({ length: 20 }, (_, index) => ({
      id: `s${index}`,
      x: 1,
      y: index + 1,
      series: `s${index}`,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "series" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const target = resolvedTarget(model, seed, "x")!;
    const inspection = materializeInspection(
      {
        model,
        seed,
        mode: "x",
        state: "transient",
        source: "pointer",
      },
      target,
      "transient",
      (index) => (model.row(index) as { id: string } | null)?.id ?? null,
    );
    expect(inspection.members).toHaveLength(TRANSIENT_MEMBER_LIMIT);
    expect(inspection.focus.key).toBe("s0");
    expect(inspection.members.some((m) => m.key === "s0")).toBe(true);
    const nonFocusY = inspection.members
      .filter((m) => m.key !== "s0")
      .map((m) => Number(m.fields.find((f) => f.channel === "y")?.value));
    nonFocusY.sort((a, b) => b - a);
    expect(nonFocusY).toEqual([20, 19, 18, 17, 16, 15, 14]);
    // Full-group stack total (sum 1..20), not the capped window.
    expect(inspection.mode).toBe("x");
    if (inspection.mode === "x" || inspection.mode === "y") {
      expect(inspection.groupTotal).toBe(210);
      expect(inspection.groupMemberCount).toBe(20);
    }
    model.dispose();
  });
});

describe("groupTotal / groupMemberCount multi-layer honesty (#1389)", () => {
  function axisInspection(
    model: ReturnType<typeof runPipeline>,
    seed: NonNullable<ReturnType<typeof model.candidates.candidate>>,
  ) {
    const target = resolvedTarget(model, seed, "x")!;
    return materializeInspection(
      {
        model,
        seed,
        mode: "x",
        state: "transient",
        source: "pointer",
      },
      target,
      "transient",
      (index) => (model.row(index) as { id: string } | null)?.id ?? null,
    );
  }

  function candidateOnLayer(
    model: ReturnType<typeof runPipeline>,
    layerIndex: number,
  ): NonNullable<ReturnType<typeof model.candidates.candidate>> {
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate !== null && candidate.layerIndex === layerIndex) return candidate;
    }
    throw new Error(`no candidate on layer ${layerIndex}`);
  }

  it("does not double-count line+point paints of the same series", () => {
    const data = [
      { id: "a1", x: 1, y: 3, series: "a" },
      { id: "b1", x: 1, y: 7, series: "b" },
      { id: "a2", x: 2, y: 4, series: "a" },
      { id: "b2", x: 2, y: 8, series: "b" },
    ];
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "series" }))
        .geomLine()
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    // Focus either layer at x=1 — total is 3+7 once, not twice.
    for (const layerIndex of [0, 1]) {
      const seed = candidateOnLayer(model, layerIndex);
      // Prefer an x=1 seed when the first layer candidate is elsewhere.
      let focus = seed;
      for (let id = 0; id < model.candidates.size; id++) {
        const c = model.candidates.candidate(id)!;
        if (c.layerIndex === layerIndex && c.xValue === 1) {
          focus = c;
          break;
        }
      }
      const inspection = axisInspection(model, focus);
      expect(inspection.mode).toBe("x");
      if (inspection.mode === "x" || inspection.mode === "y") {
        expect(inspection.groupTotal).toBe(10);
        expect(inspection.groupMemberCount).toBe(2);
      }
    }
    model.dispose();
  });

  it("includes every distinct multi-layer series when focus is a thin overlay", () => {
    // 12-series stacked columns + one-series trend line. Focus the line:
    // Total and overflow must reflect the full display group (13), not only
    // the overlay layer (1). Stack sum 1..12 = 78; trend y = 50 → 128.
    const stackData = Array.from({ length: 12 }, (_, index) => ({
      id: `s${index}`,
      x: "A",
      y: index + 1,
      series: `s${index}`,
    }));
    const trendData = [{ id: "trend", x: "A", y: 50, series: "trend" }];
    const model = runPipeline(
      gg(stackData, aes({ x: "x", y: "y", fill: "series" }))
        .geomCol({ position: "stack" })
        .geomLine({ data: trendData, aes: { x: "x", y: "y", color: "series" } })
        .spec(),
      { width: 400, height: 300 },
    );
    const trendSeed = candidateOnLayer(model, 1);
    const inspection = axisInspection(model, trendSeed);
    expect(inspection.mode).toBe("x");
    if (inspection.mode === "x" || inspection.mode === "y") {
      expect(inspection.groupTotal).toBe(128);
      expect(inspection.groupMemberCount).toBe(13);
    }
    // Transient cap still applies to listed members; overflow signal uses full count.
    expect(inspection.members.length).toBeLessThanOrEqual(TRANSIENT_MEMBER_LIMIT);
    model.dispose();
  });

  it("includes the overlay series when focus is on the stacked layer", () => {
    const stackData = Array.from({ length: 12 }, (_, index) => ({
      id: `s${index}`,
      x: "A",
      y: index + 1,
      series: `s${index}`,
    }));
    const trendData = [{ id: "trend", x: "A", y: 50, series: "trend" }];
    const model = runPipeline(
      gg(stackData, aes({ x: "x", y: "y", fill: "series" }))
        .geomCol({ position: "stack" })
        .geomLine({ data: trendData, aes: { x: "x", y: "y", color: "series" } })
        .spec(),
      { width: 400, height: 300 },
    );
    const stackSeed = candidateOnLayer(model, 0);
    const inspection = axisInspection(model, stackSeed);
    expect(inspection.mode).toBe("x");
    if (inspection.mode === "x" || inspection.mode === "y") {
      expect(inspection.groupTotal).toBe(128);
      expect(inspection.groupMemberCount).toBe(13);
    }
    model.dispose();
  });

  it("counts both columns when two layers map different y fields on the same rows", () => {
    // sales col + target line share rowIndex but read different y fields.
    // Total must be sales+target (25 at Jan), not only the first layer (10).
    // Equal values (Mar: 12+12) must still count twice — identity is the
    // mapped field, not the numeric coincidence.
    const data = [
      { id: "jan", x: "Jan", sales: 10, target: 15 },
      { id: "feb", x: "Feb", sales: 20, target: 18 },
      { id: "mar", x: "Mar", sales: 12, target: 12 },
    ];
    const model = runPipeline(
      gg(data, aes({ x: "x" }))
        .geomCol({ aes: { y: "sales" } })
        .geomLine({ aes: { y: "target" } })
        .spec(),
      { width: 400, height: 300 },
    );
    const jan = model.candidates.candidate(0)!;
    expect(jan.xValue).toBe("Jan");
    const janInspection = axisInspection(model, jan);
    expect(janInspection.mode).toBe("x");
    if (janInspection.mode === "x" || janInspection.mode === "y") {
      expect(janInspection.groupTotal).toBe(25);
      expect(janInspection.groupMemberCount).toBe(2);
    }

    let marSeed = model.candidates.candidate(0)!;
    for (let id = 0; id < model.candidates.size; id++) {
      const c = model.candidates.candidate(id)!;
      if (c.xValue === "Mar") {
        marSeed = c;
        break;
      }
    }
    const marInspection = axisInspection(model, marSeed);
    expect(marInspection.mode).toBe("x");
    if (marInspection.mode === "x" || marInspection.mode === "y") {
      expect(marInspection.groupTotal).toBe(24);
      expect(marInspection.groupMemberCount).toBe(2);
    }
    model.dispose();
  });
});
