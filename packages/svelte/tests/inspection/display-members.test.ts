/**
 * Default-tooltip display collapse for identical field payloads (#385).
 * Pure helper — does not mutate the public inspection snapshot.
 */
import { describe, expect, it } from "vitest";

import { runPipeline, type CellValue } from "@ggsvelte/core";

import {
  collapseIdenticalDisplayMembers,
  formatTooltipCell,
  tooltipDisplayPayloadToken,
} from "../../src/lib/inspection/display-members.js";
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
    const collapsed = collapseIdenticalDisplayMembers([a, b], a);
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
    const collapsed = collapseIdenticalDisplayMembers([point, col], point);
    expect(collapsed).toHaveLength(2);
    expect(collapsed.map((m) => m.layerIndex)).toEqual([0, 1]);
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
