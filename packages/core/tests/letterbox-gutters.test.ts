/**
 * Pure letterbox gutter rects (ADR 0020): unused allocation outside the
 * fitted data panel. SVG/Svelte paint these with theme.letterboxFill.
 */
import { describe, expect, it } from "bun:test";

import { letterboxGutterRects } from "../src/letterbox-gutters.ts";

describe("letterboxGutterRects", () => {
  it("returns empty when the panel fills the allocation", () => {
    const box = { x: 10, y: 20, width: 100, height: 80 };
    expect(letterboxGutterRects(box, box)).toEqual([]);
  });

  it("emits top and bottom gutters for a vertically letterboxed panel", () => {
    const allocation = { x: 0, y: 0, width: 100, height: 100 };
    const panel = { x: 0, y: 10, width: 100, height: 60 };
    expect(letterboxGutterRects(allocation, panel)).toEqual([
      { x: 0, y: 0, width: 100, height: 10 },
      { x: 0, y: 70, width: 100, height: 30 },
    ]);
  });

  it("emits left and right gutters for a horizontally letterboxed panel", () => {
    const allocation = { x: 0, y: 0, width: 100, height: 50 };
    const panel = { x: 15, y: 0, width: 60, height: 50 };
    expect(letterboxGutterRects(allocation, panel)).toEqual([
      { x: 0, y: 0, width: 15, height: 50 },
      { x: 75, y: 0, width: 25, height: 50 },
    ]);
  });

  it("emits all four gutters when the panel is inset on every side", () => {
    const allocation = { x: 10, y: 20, width: 200, height: 100 };
    const panel = { x: 30, y: 40, width: 120, height: 50 };
    expect(letterboxGutterRects(allocation, panel)).toEqual([
      { x: 10, y: 20, width: 200, height: 20 },
      { x: 10, y: 90, width: 200, height: 30 },
      { x: 10, y: 40, width: 20, height: 50 },
      { x: 150, y: 40, width: 60, height: 50 },
    ]);
  });

  it("ignores zero-size edges without fabricating empty rects", () => {
    const allocation = { x: 0, y: 0, width: 80, height: 40 };
    // Flush top/left; only right + bottom remain.
    const panel = { x: 0, y: 0, width: 50, height: 30 };
    expect(letterboxGutterRects(allocation, panel)).toEqual([
      { x: 0, y: 30, width: 80, height: 10 },
      { x: 50, y: 0, width: 30, height: 30 },
    ]);
  });
});
