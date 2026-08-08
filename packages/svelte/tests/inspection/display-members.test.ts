import "../setup-register-all.js";
/**
 * Default-tooltip display collapse for identical field payloads (#385).
 * Pure helper — does not mutate the public inspection snapshot.
 */
import { describe, expect, it } from "vitest";

import { runPipeline, type CellValue } from "@ggsvelte/core";

import {
  collapseIdenticalDisplayMembers,
  defaultTooltipRows,
  fieldsForDefaultTooltip,
  formatTooltipCell,
  selectHoverDisplayMembers,
  tooltipDisplayPayloadToken,
  tooltipFieldLabel,
} from "../../src/lib/inspection/display-members.js";
import { TRANSIENT_MEMBER_LIMIT } from "../../src/lib/inspection/resolver.js";
import type { PlotDatum, TooltipField } from "../../src/lib/interaction/interaction.js";
import { resolveInspection } from "../../src/lib/inspection/resolver.js";

function field(channel: string, fieldName: string, value: CellValue): TooltipField {
  return { channel, field: fieldName, value };
}

function member(
  partial: Partial<PlotDatum<Record<string, CellValue>, PropertyKey>> & {
    fields: readonly TooltipField[];
    layerIndex: number;
  },
): PlotDatum<Record<string, CellValue>, PropertyKey> {
  return {
    key: partial.key ?? null,
    row: partial.row ?? null,
    sourceKeys: partial.sourceKeys ?? [],
    lineageCount: partial.lineageCount ?? 1,
    layerIndex: partial.layerIndex,
    panelId: partial.panelId ?? null,
    fields: partial.fields,
    anchor: partial.anchor ?? { x: 0, y: 0 },
  };
}

describe("formatTooltipCell", () => {
  it("matches default tooltip formatting for null, Date, and rounded numbers", () => {
    expect(formatTooltipCell(null)).toBe("–");
    expect(formatTooltipCell(new Date("1985-01-01T00:00:00.000Z"))).toBe(
      "1985-01-01T00:00:00.000Z",
    );
    expect(formatTooltipCell(1.23456)).toBe("1.235");
    expect(formatTooltipCell("1985")).toBe("1985");
  });

  it("does not throw on invalid Date (live-text tokens)", () => {
    expect(formatTooltipCell(new Date(Number.NaN))).toBe("–");
  });

  it("routes position channels through axis formatters when provided (#1113)", () => {
    // Stat-derived candidates store temporal positions as epoch ms. Default
    // cell formatting would print the raw number; axis formatters already know
    // the scale (same path as the axis header). Callers pass formatters only
    // for members with no source row so identity points keep precision.
    const epoch = Date.UTC(2000, 4, 1);
    const axisFormatters = {
      x: (value: CellValue) =>
        value === null ? "–" : new Date(Number(value)).toISOString().slice(0, 10),
      y: (value: CellValue) => (value === null ? "–" : `y:${String(value)}`),
    };
    expect(formatTooltipCell(epoch)).toBe(String(epoch));
    expect(formatTooltipCell(epoch, { channel: "x", axisFormatters })).toBe("2000-05-01");
    expect(formatTooltipCell(12.3456, { channel: "y", axisFormatters })).toBe("y:12.3456");
    // Non-position channels keep the plain cell path even with formatters present.
    expect(formatTooltipCell(epoch, { channel: "color", axisFormatters })).toBe(String(epoch));
    // Without formatters (identity path), numbers keep full cell precision.
    expect(formatTooltipCell(23.7, { channel: "x" })).toBe("23.7");
  });
});

describe("tooltipFieldLabel (#752)", () => {
  it("humanizes camelCase and snake_case column names for default tooltip dt text", () => {
    expect(tooltipFieldLabel("crimePersons")).toBe("crime persons");
    expect(tooltipFieldLabel("literacy")).toBe("literacy");
    expect(tooltipFieldLabel("flipper_length")).toBe("flipper length");
    expect(tooltipFieldLabel("Region")).toBe("Region");
  });

  it("prefers the matching lab title when the channel has an explicit lab", () => {
    const labs = {
      x: "Literate conscripts (%)",
      y: "Population per crime against persons",
      color: "Region",
    };
    expect(tooltipFieldLabel("literacy", { channel: "x", labs })).toBe("Literate conscripts (%)");
    expect(tooltipFieldLabel("crimePersons", { channel: "y", labs })).toBe(
      "Population per crime against persons",
    );
    expect(tooltipFieldLabel("region", { channel: "color", labs })).toBe("Region");
  });

  it("falls back to humanized field names when the channel has no lab", () => {
    const labs = { x: "Literate conscripts (%)" };
    expect(tooltipFieldLabel("crimePersons", { channel: "y", labs })).toBe("crime persons");
    expect(tooltipFieldLabel("crimePersons", { channel: "y" })).toBe("crime persons");
    expect(tooltipFieldLabel("crimePersons", { channel: "y", labs: null })).toBe("crime persons");
  });

  it("ignores empty lab strings so hidden axis titles do not blank the tooltip", () => {
    expect(tooltipFieldLabel("literacy", { channel: "x", labs: { x: "" } })).toBe("literacy");
    expect(tooltipFieldLabel("crimePersons", { channel: "y", labs: { y: "   " } })).toBe(
      "crime persons",
    );
  });

  it("does not invent labels for channels outside Labs (e.g. group)", () => {
    const labs = { x: "Year", color: "Series" };
    expect(tooltipFieldLabel("series_id", { channel: "group", labs })).toBe("series id");
  });
});

describe("fieldsForDefaultTooltip (#754)", () => {
  const fields = [
    field("x", "literacy", 67),
    field("y", "crimePersons", 35203),
    field("color", "region", "North"),
  ];

  it("omits the shared axis channel when inspection mode is x or y", () => {
    expect(fieldsForDefaultTooltip(fields, "x").map((f) => f.field)).toEqual([
      "crimePersons",
      "region",
    ]);
    expect(fieldsForDefaultTooltip(fields, "y").map((f) => f.field)).toEqual([
      "literacy",
      "region",
    ]);
  });

  it("keeps every field for exact and xy point inspection", () => {
    expect(fieldsForDefaultTooltip(fields, "exact")).toEqual(fields);
    expect(fieldsForDefaultTooltip(fields, "xy")).toEqual(fields);
  });

  it("collapses later channels that re-list the same column (aes x=cat, fill=cat)", () => {
    // Palette-style bars: fill maps the category column for paint only.
    // A11y live-text already dedupes by field name; default tooltips must too
    // so users never see a third row repeating Squadron under "language".
    const barFields = [
      field("x", "language", "Hulks"),
      field("y", "respondents", 10271),
      field("fill", "language", "Hulks"),
    ];
    const exact = fieldsForDefaultTooltip(barFields, "exact");
    expect(exact.map((f) => f.channel)).toEqual(["x", "y"]);
    expect(exact.map((f) => f.field)).toEqual(["language", "respondents"]);

    // Axis-group: header already prints the category; fill echo of the same
    // column must drop so only the measure remains (Devin review on #1527).
    expect(fieldsForDefaultTooltip(barFields, "x").map((f) => f.field)).toEqual(["respondents"]);

    // Distinct columns stay even when values happen to match.
    const distinct = [field("x", "name", "Adelie"), field("color", "species", "Adelie")];
    expect(fieldsForDefaultTooltip(distinct, "exact").map((f) => f.field)).toEqual([
      "name",
      "species",
    ]);
  });

  it("omits weight when y already carries the aggregated reading (#1526)", () => {
    // geom_bar + weight: layerFields advertise weight for custom content, but
    // the default tooltip must not re-print barrelsMillions next to y.
    const weightedBar = [
      field("x", "year", 2014),
      field("y", "count", 158.54),
      field("fill", "package", "Bottles and cans"),
      field("weight", "barrelsMillions", 158.54),
    ];
    expect(fieldsForDefaultTooltip(weightedBar, "exact").map((f) => f.channel)).toEqual([
      "x",
      "y",
      "fill",
    ]);
    expect(fieldsForDefaultTooltip(weightedBar, "x").map((f) => f.channel)).toEqual(["y", "fill"]);
  });
});

describe("defaultTooltipRows (series-centric axis groups)", () => {
  const labs = {
    x: "Year",
    y: "Shillings",
    color: "Series",
  };

  it("collapses multi-series x-group members to series name → measure value", () => {
    // Themes wheat/wages style: aes(x=year, y=riders, color=mode).
    // Without this, each member renders "Shillings: 41" + "Series: Wheat price"
    // and three series become six noisy key-value lines.
    const wheat = [
      field("x", "month", 1565),
      field("y", "riders", 41),
      field("color", "mode", "Wheat price"),
    ];
    const rows = defaultTooltipRows(wheat, "x", { labs });
    expect(rows).toEqual([
      {
        key: "color:mode:riders",
        label: "Wheat price",
        value: 41,
        valueChannel: "y",
        valueField: "riders",
      },
    ]);
  });

  it("uses fill as series identity for stacked area groups", () => {
    const disease = [
      field("x", "year", 1855),
      field("y", "twh", 1022.8),
      field("fill", "source", "Disease"),
    ];
    const rows = defaultTooltipRows(disease, "x", {
      labs: {
        x: "Year",
        y: "Deaths per 1,000 per year",
        fill: "Cause",
      },
    });
    expect(rows).toEqual([
      {
        key: "fill:source:twh",
        label: "Disease",
        value: 1022.8,
        valueChannel: "y",
        valueField: "twh",
      },
    ]);
  });

  it("keeps traditional field labels for exact / xy point inspection", () => {
    const penguin = [
      field("x", "flipper", 180),
      field("y", "mass", 3700),
      field("color", "species", "Adelie"),
    ];
    const rows = defaultTooltipRows(penguin, "xy", {
      labs: {
        x: "Flipper length (mm)",
        y: "Body mass (g)",
        color: "Species",
      },
    });
    expect(rows.map((r) => r.label)).toEqual(["Flipper length (mm)", "Body mass (g)", "Species"]);
    expect(rows.map((r) => r.value)).toEqual([180, 3700, "Adelie"]);
  });

  it("falls back to traditional rows when series identity is blank", () => {
    // Stat aggregates can advertise fill/weight fields with null values
    // (no source row + CandidateFacts has no fillValue). Do not invent a
    // "– → measure" row; keep readable field labels so y at least shows.
    // Weight is a stat input — omit even when blank (y is the reading).
    const blankSeries = [
      field("x", "x", "1876"),
      field("y", "count", 175),
      field("fill", "level", null),
      field("weight", "deaths", null),
    ];
    const rows = defaultTooltipRows(blankSeries, "x", {
      labs: { x: "Year", y: "Deaths per million", fill: "County" },
    });
    expect(rows.map((r) => r.label)).toEqual(["Deaths per million", "County"]);
    expect(rows.map((r) => r.value)).toEqual([175, null]);
  });

  it("does not re-print weight next to the measure for exact weighted bars", () => {
    // Gallery beer dodged bars: aes(x=year, fill=package, weight=barrelsMillions).
    // Exact mode used to dump Year / Millions of barrels / Package / barrels millions.
    const beer = [
      field("x", "year", 2014),
      field("y", "count", 158.54),
      field("fill", "package", "Bottles and cans"),
      field("weight", "barrelsMillions", 158.54),
    ];
    const rows = defaultTooltipRows(beer, "exact", {
      labs: {
        x: "Year",
        y: "Millions of barrels",
        fill: "Package",
      },
    });
    expect(rows.map((r) => r.label)).toEqual(["Year", "Millions of barrels", "Package"]);
    expect(rows.map((r) => r.value)).toEqual([2014, 158.54, "Bottles and cans"]);
  });

  it("series-centric axis groups also drop the weight echo", () => {
    const beer = [
      field("x", "year", 2016),
      field("y", "count", 17),
      field("fill", "package", "Kegs and barrels"),
      field("weight", "barrelsMillions", 17),
    ];
    const rows = defaultTooltipRows(beer, "x", {
      labs: {
        x: "Year",
        y: "Millions of barrels",
        fill: "Package",
      },
    });
    expect(rows).toEqual([
      {
        key: "fill:package:count",
        label: "Kegs and barrels",
        value: 17,
        valueChannel: "y",
        valueField: "count",
      },
    ]);
  });

  it("falls back when there is no series aesthetic (single-series line)", () => {
    const single = [field("x", "year", 1855), field("y", "value", 95.7)];
    const rows = defaultTooltipRows(single, "x", {
      labs: { x: "Year", y: "£ millions" },
    });
    expect(rows).toEqual([
      {
        key: "y",
        label: "£ millions",
        value: 95.7,
        valueChannel: "y",
        valueField: "value",
      },
    ]);
  });

  it("keeps the measure label when fill only echoes the grouping axis column", () => {
    // Violin/bar palette: aes(x=run, y=velocity, fill=run). Axis header is the
    // run; body must stay "velocity: …", not "runValue: velocity".
    const violin = [field("x", "run", 3), field("y", "velocity", 850), field("fill", "run", 3)];
    const rows = defaultTooltipRows(violin, "x", {
      labs: { x: "Run", y: "Velocity" },
    });
    expect(rows).toEqual([
      {
        key: "y",
        label: "Velocity",
        value: 850,
        valueChannel: "y",
        valueField: "velocity",
      },
    ]);
  });

  it("keeps traditional rows when color/fill is continuous (number or date)", () => {
    // aes(x=date, y=price, color=volume) must not collapse to "12345: 41".
    const continuous = [
      field("x", "date", "2020-01-01"),
      field("y", "price", 41),
      field("color", "volume", 12345),
    ];
    const rows = defaultTooltipRows(continuous, "x", {
      labs: { x: "Date", y: "Price", color: "Volume" },
    });
    expect(rows.map((r) => r.label)).toEqual(["Price", "Volume"]);
    expect(rows.map((r) => r.value)).toEqual([41, 12345]);
  });
});

describe("tooltipDisplayPayloadToken", () => {
  it("ignores channel and uses display field name + formatted value", () => {
    const a = [field("x", "period", "1985"), field("y", "value", 511)];
    const b = [field("x", "period", "1985"), field("y", "value", 511)];
    // Different channels same display fields would still match if names/values match
    expect(tooltipDisplayPayloadToken(a)).toBe(tooltipDisplayPayloadToken(b));
  });

  it("distinguishes different values and different field names", () => {
    const base = [field("x", "period", "1985"), field("y", "value", 511)];
    const otherY = [field("x", "period", "1985"), field("y", "value", 520)];
    const otherName = [field("x", "period", "1985"), field("fill", "fillGroup", "X")];
    expect(tooltipDisplayPayloadToken(base)).not.toBe(tooltipDisplayPayloadToken(otherY));
    expect(tooltipDisplayPayloadToken(base)).not.toBe(tooltipDisplayPayloadToken(otherName));
  });
});

describe("collapseIdenticalDisplayMembers", () => {
  it("collapses line+point style duplicates to one display member (#385)", () => {
    const line = member({
      layerIndex: 0,
      key: 1,
      fields: [field("x", "period", "1985"), field("y", "value", 511)],
      anchor: { x: 10, y: 20 },
    });
    const point = member({
      layerIndex: 1,
      key: 1,
      fields: [field("x", "period", "1985"), field("y", "value", 511)],
      anchor: { x: 10, y: 20 },
    });
    const collapsed = collapseIdenticalDisplayMembers([line, point], point);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toBe(point);
  });

  it("prefers the focus member when collapsing duplicates", () => {
    const line = member({
      layerIndex: 0,
      fields: [field("x", "period", "1985"), field("y", "value", 511)],
    });
    const point = member({
      layerIndex: 1,
      fields: [field("x", "period", "1985"), field("y", "value", 511)],
    });
    expect(collapseIdenticalDisplayMembers([line, point], line)[0]).toBe(line);
    expect(collapseIdenticalDisplayMembers([line, point], point)[0]).toBe(point);
  });

  it("keeps multi-series members with distinct y values", () => {
    const a = member({
      layerIndex: 0,
      key: "a1",
      fields: [field("x", "x", 1), field("y", "y", 3), field("color", "series", "a")],
    });
    const b = member({
      layerIndex: 0,
      key: "b1",
      fields: [field("x", "x", 1), field("y", "y", 7), field("color", "series", "b")],
    });
    const collapsed = collapseIdenticalDisplayMembers([a, b], a, null, "x");
    expect(collapsed).toHaveLength(2);
    expect(collapsed).toEqual([a, b]);
  });

  it("keeps same-row layers with different mapped fields (point + col)", () => {
    const point = member({
      layerIndex: 0,
      key: "one",
      fields: [field("x", "x", 1), field("y", "y", 2), field("color", "colorGroup", "A")],
    });
    const col = member({
      layerIndex: 1,
      key: "one",
      fields: [field("x", "x", 1), field("y", "y", 2), field("fill", "fillGroup", "X")],
    });
    // Exact/xy still surfaces both when series channels differ.
    const collapsed = collapseIdenticalDisplayMembers([point, col], point, null, "exact");
    expect(collapsed).toHaveLength(2);
    expect(collapsed.map((m) => m.layerIndex)).toEqual([0, 1]);
  });

  it("collapses line+point that share series-centric payloads under axis mode", () => {
    // Same series → measure, no extra aesthetics: double paint collapses.
    const line = member({
      layerIndex: 0,
      key: "one",
      fields: [
        field("x", "year", 1855),
        field("y", "twh", 1022.8),
        field("fill", "source", "Disease"),
      ],
    });
    const point = member({
      layerIndex: 1,
      key: "one",
      fields: [
        field("x", "year", 1855),
        field("y", "twh", 1022.8),
        field("fill", "source", "Disease"),
      ],
    });
    const collapsed = collapseIdenticalDisplayMembers([line, point], line, null, "x");
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toBe(line);
  });

  it("collapses fill vs color for the same series name under axis mode", () => {
    // Area fill=source + line color=source both paint "Disease → 1022.8".
    const area = member({
      layerIndex: 0,
      fields: [
        field("x", "year", 1855),
        field("y", "twh", 1022.8),
        field("fill", "source", "Disease"),
      ],
    });
    const line = member({
      layerIndex: 1,
      fields: [
        field("x", "year", 1855),
        field("y", "twh", 1022.8),
        field("color", "source", "Disease"),
      ],
    });
    const collapsed = collapseIdenticalDisplayMembers([area, line], area, null, "x");
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toBe(area);
  });

  it("keeps ymin/ymax alongside series-centric measure rows", () => {
    const errorbar = [
      field("x", "year", 1855),
      field("y", "rate", 12.4),
      field("ymin", "lo", 10.1),
      field("ymax", "hi", 14.8),
      field("color", "cause", "Disease"),
    ];
    const rows = defaultTooltipRows(errorbar, "x", {
      labs: { x: "Year", y: "Rate", color: "Cause" },
    });
    expect(rows.map((r) => r.label)).toEqual(["Disease", "lo", "hi"]);
    expect(rows.map((r) => r.value)).toEqual([12.4, 10.1, 14.8]);
  });

  it("keeps sales vs target layers distinct even when the reading matches", () => {
    // Multi-measure overlay: same series name, same number, different y columns.
    // Token retains measure field so Total still matches listed rows.
    const sales = member({
      layerIndex: 0,
      fields: [field("x", "x", 1), field("y", "sales", 100), field("color", "series", "North")],
    });
    const target = member({
      layerIndex: 1,
      fields: [field("x", "x", 1), field("y", "target", 100), field("color", "series", "North")],
    });
    const collapsed = collapseIdenticalDisplayMembers([sales, target], sales, null, "x");
    expect(collapsed).toHaveLength(2);
  });

  it("preserves first-seen order of distinct display payloads", () => {
    const first = member({
      layerIndex: 0,
      fields: [field("y", "y", 1)],
    });
    const second = member({
      layerIndex: 0,
      fields: [field("y", "y", 2)],
    });
    const third = member({
      layerIndex: 1,
      fields: [field("y", "y", 1)],
    });
    const collapsed = collapseIdenticalDisplayMembers([first, second, third], second);
    expect(collapsed).toEqual([first, second]);
  });

  it("always includes focus even when it is the only survivor", () => {
    const only = member({
      layerIndex: 0,
      fields: [field("y", "y", 1)],
    });
    const collapsed = collapseIdenticalDisplayMembers([only], only);
    expect(collapsed).toEqual([only]);
    expect(collapsed[0]).toBe(only);
  });

  it("does not invent a second display member when focus is outside members with different fields", () => {
    // Mirrors incomplete host fixtures: focus is not members[0] by identity and
    // has richer fields. Count should stay members-only unless focus was missing
    // *and* has a distinct payload from every retained member *and* focus is not
    // in the input list (transient-cap case). Here focus is not in members but
    // we only prepend when distinct — that still adds one. Prefer: if focus is
    // not in members, only prepend when we need it for the transient-cap case
    // where focus payload is already covered OR truly missing from the window.
    const listed = member({
      layerIndex: 0,
      fields: [field("y", "y", 1)],
    });
    const outside = member({
      layerIndex: 0,
      fields: [field("y", "y", 1)],
    });
    // Same display payload as listed → swap to focus, length 1.
    expect(collapseIdenticalDisplayMembers([listed], outside)).toEqual([outside]);
  });

  it("keeps length ≤ members when prepending distinct focus outside the window", () => {
    const members = Array.from({ length: 8 }, (_, i) =>
      member({
        layerIndex: 0,
        key: `s-${i}`,
        fields: [field("y", "y", i)],
      }),
    );
    const outsideFocus = member({
      layerIndex: 0,
      key: "focus-out",
      fields: [field("y", "y", 99)],
    });
    const collapsed = collapseIdenticalDisplayMembers(members, outsideFocus);
    expect(collapsed).toHaveLength(8);
    expect(collapsed[0]).toBe(outsideFocus);
    expect(collapsed.some((m) => m.fields[0]?.value === 7)).toBe(false);
  });
});

describe("selectHoverDisplayMembers (#1274)", () => {
  it("preserves order when the list fits the hover limit", () => {
    const members = Array.from({ length: 4 }, (_, i) =>
      member({
        layerIndex: 0,
        key: `s${i}`,
        fields: [field("y", "y", i + 1)],
      }),
    );
    const focus = members[0];
    if (focus === undefined) throw new Error("expected members[0]");
    const selected = selectHoverDisplayMembers(members, focus, {
      mode: "x",
      limit: TRANSIENT_MEMBER_LIMIT,
    });
    expect(selected).toEqual(members);
  });

  it("keeps focus and the largest |y| slots when over the limit", () => {
    const members = Array.from({ length: 12 }, (_, i) =>
      member({
        layerIndex: 0,
        key: `s${i}`,
        fields: [field("y", "y", i + 1)],
      }),
    );
    const focus = members[0];
    if (focus === undefined) throw new Error("expected members[0]");
    const selected = selectHoverDisplayMembers(members, focus, {
      mode: "x",
      limit: TRANSIENT_MEMBER_LIMIT,
    });
    expect(selected).toHaveLength(TRANSIENT_MEMBER_LIMIT);
    expect(selected[0]).toBe(focus);
    // Prefer .sort over .toSorted: this package's TS lib target does not
    // declare Array#toSorted (oxlint type-aware treats it as error).
    const nonFocusY = selected.slice(1).map((m) => Number(m.fields[0]?.value));
    nonFocusY.sort((a, b) => b - a);
    expect(nonFocusY).toEqual([12, 11, 10, 9, 8, 7, 6]);
  });
});

describe("line + point pipeline fixture (#385)", () => {
  it("keeps multi-layer public members but collapses identical default display payloads", () => {
    const rows = [
      { period: "1980", value: 10 },
      { period: "1985", value: 511 },
      { period: "1990", value: 520 },
    ];
    const model = runPipeline(
      {
        data: { values: rows },
        layers: [
          {
            geom: "line",
            aes: {
              x: { field: "period" },
              y: { field: "value" },
              group: { value: "__all__" },
            },
          },
          { geom: "point", aes: { x: { field: "period" }, y: { field: "value" } } },
        ],
      },
      { width: 400, height: 300 },
    );

    let seed = model.candidates.candidate(0)!;
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null || candidate.rowIndex === null) continue;
      const row = model.row(candidate.rowIndex);
      if (row !== null && row["period"] === "1985") {
        seed = candidate;
        break;
      }
    }

    const inspection = resolveInspection({
      model,
      seed,
      mode: "x",
      state: "transient",
      source: "pointer",
      keyOf: (_row, index) => index,
    });

    // Public snapshot still enumerates both painted marks (oninspect / custom content).
    expect(inspection.members.length).toBeGreaterThanOrEqual(2);
    expect(new Set(inspection.members.map((m) => m.layerIndex)).size).toBeGreaterThanOrEqual(2);

    // Default tooltip / live-text presentation collapses identical field blocks.
    const display = collapseIdenticalDisplayMembers(inspection.members, inspection.focus);
    expect(display).toHaveLength(1);
    const shown = display[0];
    expect(shown.fields.map((f) => f.field)).toEqual(["period", "value"]);
    expect(shown.fields.map((f) => f.value)).toEqual(["1985", 511]);

    model.dispose();
  });
});
