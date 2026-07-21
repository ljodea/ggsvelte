export const GUIDE_SECTIONS = [
  "Start",
  "Core grammar",
  "Interaction",
  "Production",
  "Reference",
  "Release",
] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];

/** Stable HTML id / ARIA IDREF token for a guide section heading (no spaces). */
export function guideSectionDomId(section: string): string {
  return `guide-${section
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

interface GuideCatalogEntryBase {
  slug: string;
  title: string;
  description: string;
  primaryNavigationOwner?: "reference";
}

export type GuideCatalogEntry = GuideCatalogEntryBase &
  (
    | { section: GuideSection; navigationOrder: number }
    | { section?: undefined; navigationOrder?: never }
  );

/** User-facing guide identity and ordering. Guide prose remains catalog-generated. */
export const GUIDE_CATALOG = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Install ggsvelte and build one complete responsive, accessible Svelte chart.",
    section: "Start",
    navigationOrder: 1,
  },
  {
    slug: "data-mappings",
    title: "Data and mappings",
    description:
      "Choose rows and map their fields to visual channels without mutating source data.",
    section: "Core grammar",
    navigationOrder: 10,
  },
  {
    slug: "layers-marks",
    title: "Layers and marks",
    description: "Compose marks in paint order while sharing or overriding plot mappings.",
    section: "Core grammar",
    navigationOrder: 11,
  },
  {
    slug: "statistics-positions",
    title: "Statistics and positions",
    description:
      "Compute summaries and control how derived marks occupy the same coordinate space.",
    section: "Core grammar",
    navigationOrder: 12,
  },
  {
    slug: "scales-guides",
    title: "Scales and guides",
    description: "Translate data domains into position, color, labels, axes, and legends.",
    section: "Core grammar",
    navigationOrder: 13,
  },
  {
    slug: "facets-coordinates",
    title: "Facets and coordinates",
    description: "Repeat one grammar across panels and choose how axes compose the view.",
    section: "Core grammar",
    navigationOrder: 15,
  },
  {
    slug: "themes-color",
    title: "Themes and color",
    description:
      "Keep chart furniture separate from data color and from the documentation appearance.",
    section: "Core grammar",
    navigationOrder: 16,
  },
  {
    slug: "temporal-scales",
    title: "Dates without preprocessing",
    description: "Value-driven date inference, strict parsers, overrides, and diagnostics.",
    section: "Core grammar",
    navigationOrder: 14,
  },
  {
    slug: "interactions",
    title: "Interaction overview",
    description: "Inspection, selection, zoom, keyboard behavior, identity, and event contracts.",
    section: "Interaction",
    navigationOrder: 20,
  },
  {
    slug: "inspect-pin",
    title: "Inspect and pin",
    description: "Add chart-local tooltip, crosshair, keyboard traversal, and durable pinning.",
    section: "Interaction",
    navigationOrder: 21,
  },
  {
    slug: "selection-zoom",
    title: "Selection and zoom",
    description: "Choose explicit point, interval, and brush-zoom tools with semantic results.",
    section: "Interaction",
    navigationOrder: 22,
  },
  {
    slug: "linked-views",
    title: "Linked views",
    description:
      "Share semantic selection, emphasis, intervals, and domains across application surfaces.",
    section: "Interaction",
    navigationOrder: 23,
  },
  {
    slug: "accessibility",
    title: "Accessibility",
    description:
      "Name charts and preserve keyboard, touch, focus, announcement, and data-detail paths.",
    section: "Interaction",
    navigationOrder: 24,
  },
  {
    slug: "responsive-charts",
    title: "Responsive charts",
    description:
      "Size charts from their container with deterministic server and collapsed-width behavior.",
    section: "Production",
    navigationOrder: 30,
  },
  {
    slug: "rendering-performance",
    title: "Rendering and performance",
    description:
      "Choose SVG, canvas, and automatic strata while retaining semantic selection and chart chrome.",
    section: "Production",
    navigationOrder: 31,
  },
  {
    slug: "server-rendering-export",
    title: "Server rendering and export",
    description:
      "Render deterministic SVG through Svelte SSR, the pure core API, or the installed CLI.",
    section: "Production",
    navigationOrder: 32,
  },
  {
    slug: "compatibility",
    title: "Compatibility",
    description: "Tested Node, Svelte, package-manager, browser, and OS boundaries.",
    section: "Production",
    navigationOrder: 40,
  },
  {
    slug: "interaction-reference",
    title: "Interaction reference",
    description: "Search interaction props, callbacks, event phases, and diagnostic codes.",
    primaryNavigationOwner: "reference",
  },
  {
    slug: "errors",
    title: "Errors reference",
    description:
      "Understand validation, render, interaction, and CLI diagnostics and recover safely.",
    section: "Reference",
    navigationOrder: 53,
  },
  {
    slug: "advisories",
    title: "Advisories",
    description: "Spec-lint advisories and the pipeline's disclosed heuristics.",
    section: "Reference",
    navigationOrder: 54,
  },
  {
    slug: "lifecycle",
    title: "Lifecycle & editions",
    description: "API stability tags per export, and the defaults-edition mechanism.",
    section: "Reference",
    navigationOrder: 55,
  },
  {
    slug: "upgrading",
    title: "Upgrade in five minutes",
    description: "Check versions, apply fixture-backed changes, and verify each 0.x transition.",
    section: "Release",
    navigationOrder: 60,
  },
  {
    slug: "migrating-pre-0-1",
    title: "Migrating pre-0.1 interactions",
    description: "Move from tooltip and brush props to semantic interaction capabilities.",
    section: "Release",
    navigationOrder: 61,
  },
] as const satisfies readonly GuideCatalogEntry[];

export type GuideSlug = (typeof GUIDE_CATALOG)[number]["slug"];
