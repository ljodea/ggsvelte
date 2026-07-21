import { describe, expect, it } from "bun:test";

import { createLegacyRouteInventory } from "./legacy-routes.ts";

const routes = [
  {
    path: "/",
    canonicalPath: "/",
    kind: "page",
    index: true,
    sitemap: true,
    title: "Home",
    description: "Home",
    shell: "site",
  },
  {
    path: "/examples/old",
    canonicalPath: "/examples/current",
    kind: "alias",
    index: false,
    sitemap: false,
    title: "Old example",
    description: "Old example",
    shell: "site",
  },
  {
    path: "/schema/v0.json",
    canonicalPath: "/schema/v0.json",
    kind: "endpoint",
    index: false,
    sitemap: false,
    title: "Schema",
    description: "Schema",
    shell: "site",
  },
] as const;

describe("frozen legacy route inventory", () => {
  it("combines canonical, alias, sitemap, and live-crawl paths deterministically", () => {
    expect(
      createLegacyRouteInventory(routes, {
        crawledAt: "2026-07-21",
        crawlOrigin: "https://ljodea.github.io/ggsvelte",
        sitemapPaths: ["/"],
        discoveredPaths: ["/", "/examples/old", "/historical-note"],
      }),
    ).toEqual({
      schemaVersion: 1,
      sourceOrigin: "https://ljodea.github.io/ggsvelte",
      destinationOrigin: "https://ggsvelte.sh",
      crawledAt: "2026-07-21",
      benchmarkPrefix: "/bench",
      routes: [
        {
          sourcePath: "/",
          destinationPath: "/",
          kind: "page",
          sources: ["canonical", "sitemap", "live-crawl"],
        },
        {
          sourcePath: "/examples/old",
          destinationPath: "/examples/current",
          kind: "alias",
          sources: ["alias", "live-crawl"],
        },
        {
          sourcePath: "/historical-note",
          destinationPath: "/historical-note",
          kind: "crawl",
          sources: ["live-crawl"],
        },
        {
          sourcePath: "/schema/v0.json",
          destinationPath: "/schema/v0.json",
          kind: "endpoint",
          sources: ["canonical"],
        },
      ],
    });
  });

  it("rejects protocol-relative and traversal crawl paths", () => {
    for (const discoveredPath of ["//evil.example/path", "/../admin", "/%2e%2e/admin"]) {
      expect(() =>
        createLegacyRouteInventory(routes, {
          crawledAt: "2026-07-21",
          crawlOrigin: "https://ljodea.github.io/ggsvelte",
          sitemapPaths: ["/"],
          discoveredPaths: [discoveredPath],
        }),
      ).toThrow("Invalid live-crawl legacy path");
    }
  });
});
