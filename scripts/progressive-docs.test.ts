import { describe, expect, it } from "bun:test";

import { DOCS_ROUTES } from "../apps/docs/src/lib/generated/routes.ts";
import lifecycle from "../lifecycle.json";
import { createDocsRouteInventory } from "./docs-route-inventory.ts";
import { GETTING_STARTED_MD, guidePages, type LifecycleDoc } from "./gen-llms.ts";
import { extractMarkdownHeadings } from "./llms-markdown.ts";
import {
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  SAKURA_STEPS,
} from "./quickstart.ts";

describe("progressive Docs journey", () => {
  it("lands the data-and-mappings chapter before the first lesson deep link", () => {
    expect(
      createDocsRouteInventory().find((route) => route.path === "/guide/data-mappings"),
    ).toMatchObject({
      canonicalPath: "/guide/data-mappings",
      shell: "docs",
      index: true,
      sitemap: true,
      navigation: { section: "Core grammar", label: "Data and mappings", order: 10 },
    });
    const page = guidePages(lifecycle as unknown as LifecycleDoc).find(
      (entry) => entry.slug === "data-mappings",
    );
    expect(page?.markdown).toContain("# Data and mappings");
    expect(page?.markdown).toContain("/examples/point/scatter-color");
  });

  it("lands a real chapter behind every lesson deep link", () => {
    // The lesson teaches by accretion, so each step hands the reader off to
    // the chapter that owns the element it just added. Those links are checked
    // structurally — chapter exists, is navigable, and really has the anchor —
    // rather than by restating step titles that the lesson is free to reword.
    const inventory = createDocsRouteInventory();
    const pages = guidePages(lifecycle as unknown as LifecycleDoc);
    expect(SAKURA_STEPS.length).toBeGreaterThanOrEqual(6);

    for (const step of SAKURA_STEPS) {
      const [path, anchor] = step.href.split("#") as [string, string];
      const route = inventory.find((entry) => entry.path === path);
      expect(route, `no route for ${step.href}`).toBeDefined();
      expect(route?.navigation?.label, `${path} is not navigable`).toBeTruthy();
      expect(route?.navigation?.label).toBe(step.chapterTitle);

      const page = pages.find((entry) => `/guide/${entry.slug}` === path);
      expect(page, `no guide page for ${path}`).toBeDefined();
      const anchors = extractMarkdownHeadings(page!.markdown).map((heading) => heading.id);
      expect(anchors, `${path} has no #${anchor}`).toContain(anchor);
    }
  });

  it("publishes the remaining interaction and production chapters as navigable evidence paths", () => {
    const expected = [
      ["/guide/selection-zoom", "Interaction", 22, "/interactions/brush-zoom"],
      ["/guide/linked-views", "Interaction", 23, "/interactions/linked-views"],
      ["/guide/accessibility", "Interaction", 24, "/examples/interaction/tooltip"],
      ["/guide/responsive-charts", "Production", 30, "/guide/errors#quickstart-troubleshooting"],
      ["/guide/rendering-performance", "Production", 31, "/examples/point/canvas-scatter"],
      ["/guide/server-rendering-export", "Production", 32, "/reference/cli"],
    ] as const;
    const inventory = createDocsRouteInventory();
    const pages = guidePages(lifecycle as unknown as LifecycleDoc);
    for (const [path, section, order, evidence] of expected) {
      const route = inventory.find((entry) => entry.path === path);
      expect(route?.navigation).toMatchObject({ section, order });
      const page = pages.find((entry) => `/guide/${entry.slug}` === path);
      expect(page?.markdown).toContain(evidence);
    }
  });

  it("shares secondary surface fragments with the generated guide", () => {
    for (const fragment of [
      QUICKSTART_BUILDER_FRAGMENT,
      QUICKSTART_PORTABLE_SPEC_FRAGMENT,
      QUICKSTART_HEADLESS_FRAGMENT,
      QUICKSTART_CLI_FRAGMENT,
    ]) {
      expect(GETTING_STARTED_MD).toContain(fragment);
    }
  });

  it("keeps every lesson anchor and title aligned with generated route headings", () => {
    const stepIds: ReadonlySet<string> = new Set(SAKURA_STEPS.map((step) => step.id));
    const route = DOCS_ROUTES.find((entry) => entry.path === "/guide/getting-started");
    // Widened off the generated literal union — see getting-started-headings.
    const stepHeadings: { id: string; title: string }[] | undefined = route?.headings
      ?.filter((heading) => stepIds.has(heading.id))
      .map(({ id, title }) => ({ id, title }));
    expect(stepHeadings).toEqual(SAKURA_STEPS.map(({ id, title }) => ({ id, title })));
  });

  it("keeps the human lesson out of the agent surface", () => {
    // D6: /llms.txt is the agent path and no longer mirrors the walkthrough.
    // The shared facts (install, complete file, spec, headless) still come
    // from one catalog — asserted above — but the narrative does not.
    for (const step of SAKURA_STEPS) {
      expect(GETTING_STARTED_MD).not.toContain(`### ${step.title}`);
      // Empty outcomes are intentional (no marketing prose on the human page).
      if (step.outcome !== "") {
        expect(GETTING_STARTED_MD).not.toContain(step.outcome);
      }
    }
    expect(GETTING_STARTED_MD).toContain("/guide/getting-started");
  });
});
