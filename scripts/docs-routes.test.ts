import { describe, expect, it } from "bun:test";

import {
  findDocsRoute,
  guideSequence,
  primaryNavigationOwner,
  routePath,
  sitemapRoutes,
} from "../apps/docs/src/lib/routes.ts";

describe("runtime docs route projection helpers", () => {
  it("strips only an exact deployment base boundary and normalizes trailing slashes", () => {
    expect(routePath("/ggsvelte", "/ggsvelte")).toBe("/");
    expect(routePath("/ggsvelte/guide/getting-started/", "/ggsvelte")).toBe(
      "/guide/getting-started",
    );
    expect(routePath("/ggsvelte-other/guide/getting-started", "/ggsvelte")).toBe(
      "/ggsvelte-other/guide/getting-started",
    );
  });

  it("projects guide sequence and sitemap policy from generated route facts", () => {
    expect(guideSequence("/guide/getting-started").previous?.path).toBe("/docs");
    expect(guideSequence("/guide/getting-started").next?.path).toBe("/guide/data-mappings");
    expect(sitemapRoutes().some((route) => route.kind === "alias")).toBe(false);
    expect(findDocsRoute("/examples/interactions/inspection")?.index).toBe(false);
  });

  it("assigns preserved reference guides to the global Reference navigation owner", () => {
    expect(primaryNavigationOwner(findDocsRoute("/docs"))).toBe("docs");
    expect(primaryNavigationOwner(findDocsRoute("/guide/getting-started"))).toBe("docs");
    expect(primaryNavigationOwner(findDocsRoute("/guide/errors"))).toBe("reference");
    expect(primaryNavigationOwner(findDocsRoute("/guide/interaction-reference"))).toBe("reference");
    expect(primaryNavigationOwner(findDocsRoute("/reference/interactions"))).toBe("reference");
    expect(primaryNavigationOwner(findDocsRoute("/themes"))).toBeUndefined();
  });
});
