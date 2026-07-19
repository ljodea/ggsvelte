import { describe, expect, it } from "bun:test";

import {
  createDocsRouteInventory,
  routeCanonicalUrl,
  validateRouteInventory,
  type DocsRouteRecord,
} from "./docs-route-inventory.ts";

const route = (overrides: Partial<DocsRouteRecord> = {}): DocsRouteRecord => ({
  path: "/guide/start",
  title: "Start",
  description: "A complete route description.",
  canonicalPath: "/guide/start",
  kind: "page",
  index: true,
  sitemap: true,
  shell: "docs",
  ...overrides,
});

describe("docs route inventory", () => {
  it("projects every current domain into one validated concrete route list", () => {
    const inventory = createDocsRouteInventory();
    const paths = new Set(inventory.map((entry) => entry.path));

    expect(paths.has("/")).toBe(true);
    expect(paths.has("/guide/getting-started")).toBe(true);
    expect(paths.has("/examples")).toBe(true);
    expect(paths.has("/examples/point/scatter-color")).toBe(true);
    expect(paths.has("/examples/interactions/inspection")).toBe(true);
    expect(paths.has("/playground")).toBe(true);
    expect(paths.has("/reference/interactions")).toBe(true);
    expect(paths.has("/__perf/r3-interaction")).toBe(true);
    expect(paths.has("/sitemap.xml")).toBe(true);
    expect(paths.has("/robots.txt")).toBe(true);

    expect(validateRouteInventory(inventory)).toBe(inventory);
    expect(JSON.parse(JSON.stringify(inventory))).toEqual(inventory);
  });

  it("keeps aliases canonicalized, noindex, and out of the sitemap", () => {
    const alias = createDocsRouteInventory().find(
      (entry) => entry.path === "/examples/interactions/inspection",
    );

    expect(alias).toMatchObject({
      kind: "alias",
      canonicalPath: "/examples/interaction/tooltip",
      index: false,
      sitemap: false,
    });
  });

  it("keeps performance routes noindex and out of acquisition navigation", () => {
    const perf = createDocsRouteInventory().filter((entry) => entry.path.startsWith("/__perf/"));

    expect(perf).not.toHaveLength(0);
    for (const entry of perf) {
      expect(entry.index).toBe(false);
      expect(entry.sitemap).toBe(false);
      expect(entry.navigation).toBeUndefined();
    }
  });

  it("builds absolute canonical URLs without leaking the legacy prefix", () => {
    expect(routeCanonicalUrl(route(), "https://ggsvelte.sh")).toBe(
      "https://ggsvelte.sh/guide/start",
    );
    expect(routeCanonicalUrl(route(), "https://ljodea.github.io/ggsvelte")).toBe(
      "https://ljodea.github.io/ggsvelte/guide/start",
    );
  });

  it("rejects duplicates, alias cycles, missing targets, and incomplete metadata", () => {
    const cases: DocsRouteRecord[][] = [
      [route(), route()],
      [
        route({ path: "/a", canonicalPath: "/b", kind: "alias", index: false, sitemap: false }),
        route({ path: "/b", canonicalPath: "/a", kind: "alias", index: false, sitemap: false }),
      ],
      [route({ path: "/a", canonicalPath: "/missing", kind: "alias" })],
      [route({ description: "" })],
      [route({ canonicalPath: "relative" })],
    ];

    for (const inventory of cases) {
      expect(() => validateRouteInventory(inventory)).toThrow("route inventory");
    }
  });
});
