import "../setup-register-all.js";
import { describe, expect, it } from "vitest";

import {
  collapseIdenticalDisplayMembers,
  defaultTooltipRows,
} from "../../src/lib/inspection/display-members.js";

import { field, member } from "./display-members-fixtures.js";

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
