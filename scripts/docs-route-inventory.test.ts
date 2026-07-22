import { describe, expect, it } from "bun:test";

import { CLI_REFERENCE_OPTIONS } from "./cli-docs.ts";
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
    expect(paths.has("/docs")).toBe(true);
    expect(paths.has("/guide/getting-started")).toBe(true);
    expect(paths.has("/reference")).toBe(true);
    expect(paths.has("/examples")).toBe(true);
    expect(paths.has("/examples/point/scatter-color")).toBe(true);
    expect(paths.has("/examples/interactions/inspection")).toBe(true);
    expect(paths.has("/playground")).toBe(true);
    expect(paths.has("/themes")).toBe(true);
    expect(paths.has("/reference/interactions")).toBe(true);
    expect(paths.has("/reference/cli")).toBe(true);
    expect(paths.has("/__perf/r3-interaction")).toBe(true);
    expect(paths.has("/sitemap.xml")).toBe(true);
    expect(paths.has("/robots.txt")).toBe(true);

    expect(validateRouteInventory(inventory)).toBe(inventory);
    expect(JSON.parse(JSON.stringify(inventory))).toEqual(inventory);
  });

  it("publishes task-first Docs and one Reference landing with canonical metadata", () => {
    const inventory = createDocsRouteInventory();
    expect(inventory.find((entry) => entry.path === "/docs")).toMatchObject({
      title: "Documentation — ggsvelte",
      canonicalPath: "/docs",
      kind: "page",
      index: true,
      sitemap: true,
      shell: "docs",
      navigation: { section: "Start", label: "Overview", order: 0 },
    });
    expect(inventory.find((entry) => entry.path === "/reference")).toMatchObject({
      title: "Reference — ggsvelte",
      canonicalPath: "/reference",
      kind: "page",
      index: true,
      sitemap: true,
      shell: "docs",
      navigation: { section: "Reference", label: "Reference overview", order: 50 },
    });
  });

  it("keeps every navigation target concrete and gives global Reference active ownership", () => {
    const inventory = createDocsRouteInventory();
    const byPath = new Map(inventory.map((entry) => [entry.path, entry]));
    const navigation = inventory.filter((entry) => entry.navigation !== undefined);

    for (const entry of navigation) expect(byPath.has(entry.path), entry.path).toBe(true);
    expect(byPath.get("/guide/errors")?.navigation?.section).toBe("Reference");
    expect(byPath.get("/guide/interaction-reference")?.navigation).toBeUndefined();
    expect(byPath.has("/guide")).toBe(false);
  });

  it("publishes the CLI reference inside the one Reference hierarchy", () => {
    const cliRoute = createDocsRouteInventory().find((entry) => entry.path === "/reference/cli");
    expect(cliRoute).toMatchObject({
      title: "Command-line reference — ggsvelte",
      canonicalPath: "/reference/cli",
      kind: "page",
      index: true,
      sitemap: true,
      shell: "docs",
      navigation: { section: "Reference", label: "CLI reference", order: 52 },
    });
    expect(cliRoute?.headings?.filter((heading) => heading.level === 3)).toEqual(
      CLI_REFERENCE_OPTIONS.map((option) => ({
        id: option.anchor,
        title: option.flag,
        level: 3,
      })),
    );
  });

  it("publishes the themes destination with canonical acquisition metadata", () => {
    expect(createDocsRouteInventory().find((entry) => entry.path === "/themes")).toEqual({
      path: "/themes",
      title: "Chart themes and color scales — ggsvelte",
      description: "Built-in chart themes, categorical palettes, and sequential scales.",
      canonicalPath: "/themes",
      kind: "page",
      index: true,
      sitemap: true,
      shell: "site",
    });
  });

  it("publishes the interactions demo with canonical acquisition metadata", () => {
    expect(createDocsRouteInventory().find((entry) => entry.path === "/interactions")).toEqual({
      path: "/interactions",
      title: "Chart-local interaction — ggsvelte",
      description:
        "Inspect, select, zoom, and legend focus on a live chart. Semantic state is opt-in.",
      canonicalPath: "/interactions",
      kind: "page",
      index: true,
      sitemap: true,
      shell: "site",
    });
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

  it("requires unique acquisition metadata across indexable canonical routes", () => {
    expect(() =>
      validateRouteInventory([
        route({ path: "/a", canonicalPath: "/a", title: "Same", description: "Same." }),
        route({ path: "/b", canonicalPath: "/b", title: "Same", description: "Different." }),
      ]),
    ).toThrow("duplicate indexable title");
    expect(() =>
      validateRouteInventory([
        route({ path: "/a", canonicalPath: "/a", title: "First", description: "Same." }),
        route({ path: "/b", canonicalPath: "/b", title: "Second", description: "Same." }),
      ]),
    ).toThrow("duplicate indexable description");
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
