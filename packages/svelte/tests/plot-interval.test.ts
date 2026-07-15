import { describe, expect, it } from "vitest";

import {
  BRUSH_MIN_SPAN_PX,
  buildIntervalSelection,
  clearIntervalSelectionEvent,
  filterDomainBySelectMode,
  freezeIntervalDomain,
  isBrushTooSmall,
} from "../src/lib/plot-interval.js";

describe("isBrushTooSmall (pointer brush-end gate)", () => {
  it("defaults min span to 4", () => {
    expect(BRUSH_MIN_SPAN_PX).toBe(4);
  });

  it("requires BOTH width and height strictly less than min (&&)", () => {
    // 3×3 — both under min
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 3, y1: 3 })).toBe(true);
    // one axis meets min → not too small
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 5, y1: 3 })).toBe(false);
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 3, y1: 5 })).toBe(false);
    // exactly min on both is NOT < min
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 4, y1: 4 })).toBe(false);
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 0, y1: 0 })).toBe(true);
  });

  it("uses raw x1-x0/y1-y0 (callers must normalize first)", () => {
    // Negative spans are also < min; production always normalizes before this gate.
    expect(isBrushTooSmall({ x0: 10, y0: 10, x1: 0, y1: 0 })).toBe(true);
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 10, y1: 1 })).toBe(false);
  });

  it("honors an explicit minPx", () => {
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 8, y1: 8 }, 10)).toBe(true);
    expect(isBrushTooSmall({ x0: 0, y0: 0, x1: 10, y1: 10 }, 10)).toBe(false);
  });
});

describe("filterDomainBySelectMode", () => {
  const domain = {
    x: [0, 1] as [number, number],
    y: [2, 3] as [number, number],
  };

  it("drops y for x-mode and x for y-mode", () => {
    expect(filterDomainBySelectMode(domain, "x")).toEqual({ x: [0, 1] });
    expect(filterDomainBySelectMode(domain, "y")).toEqual({ y: [2, 3] });
  });

  it("keeps both for xy-mode", () => {
    expect(filterDomainBySelectMode(domain, "xy")).toEqual(domain);
  });

  it("omits missing axes", () => {
    expect(filterDomainBySelectMode({ x: [0, 1] }, "xy")).toEqual({ x: [0, 1] });
    expect(filterDomainBySelectMode({}, "x")).toEqual({});
  });
});

describe("freezeIntervalDomain", () => {
  it("freezes outer object and nested tuples", () => {
    const frozen = freezeIntervalDomain({
      x: [1, 2],
      y: [3, 4],
    });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.x)).toBe(true);
    expect(Object.isFrozen(frozen.y)).toBe(true);
    expect(frozen).toEqual({ x: [1, 2], y: [3, 4] });
  });

  it("returns frozen empty object when no axes", () => {
    const frozen = freezeIntervalDomain({});
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(frozen).toEqual({});
  });
});

describe("buildIntervalSelection", () => {
  it("returns a deeply frozen IntervalSelection payload", () => {
    const event = buildIntervalSelection({
      phase: "end",
      mode: "xy",
      panelId: "p0",
      domain: { x: [0, 10], y: [1, 2] },
      pixels: { x0: 1, y0: 2, x1: 3, y1: 4 },
      keys: ["a", "b"],
      lineageCount: 2,
      source: "pointer",
    });
    expect(event.type).toBe("select");
    expect(event.phase).toBe("end");
    expect(event.mode).toBe("xy");
    expect(event.panelId).toBe("p0");
    expect(event.lineageCount).toBe(2);
    expect(event.source).toBe("pointer");
    expect(event.keys).toEqual(["a", "b"]);
    expect(event.pixels).toEqual({ x0: 1, y0: 2, x1: 3, y1: 4 });
    expect(event.domain).toEqual({ x: [0, 10], y: [1, 2] });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.keys)).toBe(true);
    expect(Object.isFrozen(event.pixels)).toBe(true);
    expect(Object.isFrozen(event.domain)).toBe(true);
    expect(Object.isFrozen(event.domain.x)).toBe(true);
    expect(Object.isFrozen(event.domain.y)).toBe(true);
  });
});

describe("clearIntervalSelectionEvent", () => {
  it("preserves mode/panelId/pixels and clears domain/keys/lineage", () => {
    const previous = buildIntervalSelection({
      phase: "end",
      mode: "x",
      panelId: "panel-1",
      domain: { x: [0, 1] },
      pixels: { x0: 5, y0: 6, x1: 15, y1: 16 },
      keys: ["k"],
      lineageCount: 3,
      source: "pointer",
    });
    const cleared = clearIntervalSelectionEvent(previous, "keyboard");
    expect(cleared).toEqual({
      type: "select",
      phase: "clear",
      mode: "x",
      panelId: "panel-1",
      domain: {},
      pixels: { x0: 5, y0: 6, x1: 15, y1: 16 },
      keys: [],
      lineageCount: 0,
      source: "keyboard",
    });
    expect(Object.isFrozen(cleared)).toBe(true);
    expect(Object.isFrozen(cleared.domain)).toBe(true);
    expect(Object.isFrozen(cleared.keys)).toBe(true);
    expect(Object.isFrozen(cleared.pixels)).toBe(true);
    // pixels is a copy, not the same reference
    expect(cleared.pixels).not.toBe(previous.pixels);
  });
});
