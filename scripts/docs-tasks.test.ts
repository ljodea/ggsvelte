import { describe, expect, it } from "bun:test";

import { DOCS_TASKS } from "../apps/docs/src/lib/catalog/docs-tasks.ts";

const expected = [
  ["Getting started", ["/guide/getting-started"]],
  ["Scales, themes, color", ["/guide/scales-guides", "/guide/themes-color"]],
  ["Interaction", ["/guide/inspect-pin"]],
  ["Layout and export", ["/guide/responsive-charts", "/guide/server-rendering-export"]],
  ["Diagnostics", ["/guide/errors"]],
] as const;

describe("Docs entry points", () => {
  it("keeps the approved labels and ordered destinations literal", () => {
    expect(DOCS_TASKS.map((task) => [task.label, task.hrefs])).toEqual(expected);
  });

  it("gives every task a concrete destination description", () => {
    for (const task of DOCS_TASKS) {
      expect(task.description.length).toBeGreaterThan(20);
      expect(task.hrefs[0]?.startsWith("/")).toBe(true);
    }
  });
});
