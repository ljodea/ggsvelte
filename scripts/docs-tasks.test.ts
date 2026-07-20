import { describe, expect, it } from "bun:test";

import { DOCS_TASKS } from "../apps/docs/src/lib/catalog/docs-tasks.ts";

const expected = [
  ["Build a chart", ["/guide/getting-started"]],
  ["Customize it", ["/guide/scales-guides", "/guide/themes-color"]],
  ["Add interaction", ["/guide/inspect-pin"]],
  ["Deploy it", ["/guide/responsive-charts", "/guide/server-rendering-export"]],
  ["Troubleshoot it", ["/guide/errors"]],
] as const;

describe("task-first Docs entry points", () => {
  it("keeps the approved labels and ordered destinations literal", () => {
    expect(DOCS_TASKS.map((task) => [task.label, task.hrefs])).toEqual(expected);
  });

  it("gives every task a concrete outcome rather than an icon/category summary", () => {
    for (const task of DOCS_TASKS) {
      expect(task.description.length).toBeGreaterThan(30);
      expect(task.hrefs[0]?.startsWith("/")).toBe(true);
    }
  });
});
