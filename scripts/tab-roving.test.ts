import { describe, expect, test } from "bun:test";

import { nextRovingTabIndex } from "../apps/docs/src/lib/tab-roving";

describe("nextRovingTabIndex", () => {
  test("moves right/down and wraps", () => {
    expect(nextRovingTabIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextRovingTabIndex("ArrowDown", 2, 3)).toBe(0);
  });

  test("moves left/up and wraps", () => {
    expect(nextRovingTabIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextRovingTabIndex("ArrowUp", 1, 3)).toBe(0);
  });

  test("Home and End jump to ends", () => {
    expect(nextRovingTabIndex("Home", 2, 4)).toBe(0);
    expect(nextRovingTabIndex("End", 0, 4)).toBe(3);
  });

  test("returns null for unknown keys and empty tablists", () => {
    expect(nextRovingTabIndex("Enter", 0, 3)).toBeNull();
    expect(nextRovingTabIndex("ArrowRight", 0, 0)).toBeNull();
    expect(nextRovingTabIndex("Home", 0, -1)).toBeNull();
  });
});
