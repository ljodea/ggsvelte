import { describe, expect, it } from "bun:test";

import { DOCS_ROUTES } from "../apps/docs/src/lib/generated/routes.ts";
import lifecycle from "../lifecycle.json";
import { createDocsRouteInventory } from "./docs-route-inventory.ts";
import { GETTING_STARTED_MD, guidePages, type LifecycleDoc } from "./gen-llms.ts";
import {
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_LESSON_STEPS,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
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

  it("lands Layers and marks before the second lesson adds its deep link", () => {
    expect(
      createDocsRouteInventory().find((route) => route.path === "/guide/layers-marks"),
    ).toMatchObject({
      navigation: { section: "Core grammar", label: "Layers and marks", order: 11 },
    });
    expect(QUICKSTART_LESSON_STEPS[1]).toEqual({
      id: "add-a-second-layer",
      title: "Add a second layer",
      outcome: "Line under points; both layers share plot aes.",
      fragment: "<GeomLine />\n<GeomPoint />",
      explanation: "Layers paint in source order; a layer may override mapping or data.",
      chapterTitle: "Layers and marks",
      href: "/guide/layers-marks#compose-layers",
    });
  });

  it("lands every remaining lesson chapter before its literal deep link", () => {
    const expected = [
      [
        "/guide/scales-guides",
        { section: "Core grammar", label: "Scales and guides", order: 13 },
        {
          id: "make-color-meaning-explicit",
          title: "Make color meaning explicit",
          href: "/guide/scales-guides#categorical-color",
        },
      ],
      [
        "/guide/statistics-positions",
        { section: "Core grammar", label: "Statistics and positions", order: 12 },
        {
          id: "add-a-statistical-smoother",
          title: "Add a statistical smoother",
          href: "/guide/statistics-positions#statistical-summaries",
        },
      ],
      [
        "/guide/facets-coordinates",
        { section: "Core grammar", label: "Facets and coordinates", order: 15 },
        {
          id: "facet-the-comparison",
          title: "Facet the comparison",
          href: "/guide/facets-coordinates#facet-a-comparison",
        },
      ],
      [
        "/guide/themes-color",
        { section: "Core grammar", label: "Themes and color", order: 16 },
        {
          id: "choose-a-chart-theme",
          title: "Choose a chart theme",
          href: "/guide/themes-color#choose-a-chart-theme",
        },
      ],
      [
        "/guide/inspect-pin",
        { section: "Interaction", label: "Inspect and pin", order: 21 },
        {
          id: "enable-inspect-and-pin",
          title: "Enable inspect and pin",
          href: "/guide/inspect-pin#inspect-and-pin",
        },
      ],
    ] as const;
    const inventory = createDocsRouteInventory();
    for (const [path, navigation, step] of expected) {
      expect(inventory.find((route) => route.path === path)?.navigation).toEqual(navigation);
      expect(
        QUICKSTART_LESSON_STEPS.some(
          (entry) => entry.id === step.id && entry.title === step.title && entry.href === step.href,
        ),
      ).toBe(true);
    }
  });

  it("publishes the remaining interaction and production chapters as navigable evidence paths", () => {
    const expected = [
      ["/guide/selection-zoom", "Interaction", 22, "/examples/interaction/brush-zoom"],
      ["/guide/linked-views", "Interaction", 23, "/examples/interaction/linked-views"],
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
    const stepIds: ReadonlySet<string> = new Set(QUICKSTART_LESSON_STEPS.map((step) => step.id));
    const route = DOCS_ROUTES.find((entry) => entry.path === "/guide/getting-started");
    expect(
      route?.headings
        ?.filter((heading) => stepIds.has(heading.id))
        .map(({ id, title }) => ({ id, title })),
    ).toEqual(QUICKSTART_LESSON_STEPS.map(({ id, title }) => ({ id, title })));
  });

  it("uses one catalog for the first observable lesson delta and generated markdown", () => {
    expect(QUICKSTART_LESSON_STEPS[0]).toEqual({
      id: "map-fields-to-position",
      title: "Map fields to position",
      outcome: "Map fields to x and y; source rows stay unchanged.",
      fragment: 'aes={{ x: "weight", y: "economy" }}',
      explanation: "aes names channels; it does not reshape the data.",
      chapterTitle: "Data and mappings",
      href: "/guide/data-mappings#map-fields-to-position",
    });
    expect(GETTING_STARTED_MD).toContain("## Build the grammar one change at a time");
    expect(GETTING_STARTED_MD).toContain("### Map fields to position");
    expect(GETTING_STARTED_MD).toContain('```svelte fragment\naes={{ x: "weight", y: "economy" }}');
    expect(GETTING_STARTED_MD).toContain(
      "[Read Data and mappings](/guide/data-mappings#map-fields-to-position)",
    );
  });
});
