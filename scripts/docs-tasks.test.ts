import { describe, expect, it } from "bun:test";

import { DOCS_TASKS } from "../apps/docs/src/lib/catalog/docs-tasks.ts";

// Typed wide rather than `as const`: DOCS_TASKS is a const-asserted literal, so
// an `as const` expectation compares two readonly tuple types and toEqual has no
// overload for that. The assertion is a runtime deep-equal either way.
const expected: [string, readonly string[]][] = [
  ["Getting started", ["/guide/getting-started"]],
  ["Scales, themes, color", ["/guide/scales-guides", "/guide/themes-color"]],
  ["Interaction", ["/guide/inspect-pin"]],
  ["Layout and export", ["/guide/responsive-charts", "/guide/server-rendering-export"]],
  ["Diagnostics", ["/guide/errors"]],
];

describe("Docs entry points", () => {
  it("keeps the approved labels and ordered destinations literal", () => {
    const published: [string, readonly string[]][] = DOCS_TASKS.map((task) => [
      task.label,
      task.hrefs,
    ]);
    expect(published).toEqual(expected);
  });

  it("gives every task a concrete destination description", () => {
    for (const task of DOCS_TASKS) {
      expect(task.description.length).toBeGreaterThan(20);
      expect(task.hrefs[0]?.startsWith("/")).toBe(true);
    }
  });
});
