import { describe, expect, test } from "bun:test";

import { siteSearchKeyAction } from "../apps/docs/src/lib/site-search-keyboard";

describe("siteSearchKeyAction", () => {
  test("ArrowDown/Up wrap through the list including from -1", () => {
    expect(siteSearchKeyAction("ArrowDown", -1, 3)).toEqual({ type: "move", index: 0 });
    expect(siteSearchKeyAction("ArrowDown", 2, 3)).toEqual({ type: "move", index: 0 });
    expect(siteSearchKeyAction("ArrowUp", 0, 3)).toEqual({ type: "move", index: 2 });
    expect(siteSearchKeyAction("ArrowUp", -1, 3)).toEqual({ type: "move", index: 1 });
  });

  test("Home and End jump to ends", () => {
    expect(siteSearchKeyAction("Home", 2, 4)).toEqual({ type: "move", index: 0 });
    expect(siteSearchKeyAction("End", 0, 4)).toEqual({ type: "move", index: 3 });
  });

  test("Enter selects only when an option is active", () => {
    expect(siteSearchKeyAction("Enter", 1, 3)).toEqual({ type: "select" });
    expect(siteSearchKeyAction("Enter", -1, 3)).toEqual({ type: "ignore" });
  });

  test("Escape always closes", () => {
    expect(siteSearchKeyAction("Escape", 0, 0)).toEqual({ type: "close" });
  });

  test("navigation is ignored when there are no results", () => {
    expect(siteSearchKeyAction("ArrowDown", -1, 0)).toEqual({ type: "ignore" });
    expect(siteSearchKeyAction("Home", 0, 0)).toEqual({ type: "ignore" });
  });

  test("unknown keys are ignored so preventDefault is not applied", () => {
    expect(siteSearchKeyAction("a", 0, 3)).toEqual({ type: "ignore" });
    expect(siteSearchKeyAction("Tab", 0, 3)).toEqual({ type: "ignore" });
  });
});
