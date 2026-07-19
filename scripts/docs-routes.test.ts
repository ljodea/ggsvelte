import { describe, expect, it } from "bun:test";

import {
  findDocsRoute,
  guideSequence,
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
    expect(guideSequence("/guide/interactions").previous?.path).toBe("/guide/getting-started");
    expect(guideSequence("/guide/interactions").next?.path).toBe("/guide/compatibility");
    expect(sitemapRoutes().some((route) => route.kind === "alias")).toBe(false);
    expect(findDocsRoute("/examples/interactions/inspection")?.index).toBe(false);
  });
});
