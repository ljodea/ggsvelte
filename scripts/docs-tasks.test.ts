import { describe, expect, it } from "bun:test";

import { DOCS_TASKS } from "../apps/docs/src/lib/catalog/docs-tasks.ts";
import { GUIDE_CATALOG } from "../apps/docs/src/lib/catalog/guide.ts";
import { GUIDE_NAVIGATION } from "../apps/docs/src/lib/generated/routes.ts";

// Typed wide rather than `as const`: DOCS_TASKS is a const-asserted literal, so
// an `as const` expectation compares two readonly tuple types and toEqual has no
// overload for that. The assertion is a runtime deep-equal either way.
const expected: [string, readonly string[]][] = [
  ["Getting started", ["/guide/getting-started"]],
  ["Scales, themes, color", ["/guide/scales-guides"]],
  ["Interaction", ["/guide/interactions"]],
  ["Layout and export", ["/guide/production"]],
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

  it("keeps progressive tasks as a short subset of the full guide map", () => {
    // Search still surfaces DOCS_TASKS as common destinations; the landing
    // page chapter index lists every navigable guide.
    const taskDestinations = new Set(DOCS_TASKS.flatMap((task) => [...task.hrefs]));
    const chapterPaths = GUIDE_NAVIGATION.flatMap((group) =>
      group.entries.map((entry) => entry.path),
    ).filter((path) => path !== "/docs");
    expect(chapterPaths.length).toBeGreaterThan(taskDestinations.size);
    for (const href of taskDestinations) {
      expect(chapterPaths.some((path) => path === href)).toBe(true);
    }
  });

  it("publishes a description for every guide chapter on the landing map", () => {
    const guidePaths = new Set(GUIDE_CATALOG.map((entry) => `/guide/${entry.slug}`));
    for (const entry of GUIDE_CATALOG) {
      expect(entry.description.length).toBeGreaterThan(20);
    }
    // Every navigable /guide/* chapter path is covered by catalog descriptions.
    for (const group of GUIDE_NAVIGATION) {
      for (const entry of group.entries) {
        if (!entry.path.startsWith("/guide/")) continue;
        expect(guidePaths.has(entry.path)).toBe(true);
      }
    }
  });
});
