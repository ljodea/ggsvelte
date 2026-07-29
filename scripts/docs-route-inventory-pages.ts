/**
 * Hand-authored docs route tables: top-level pages, machine endpoints, and
 * internal performance fixtures. Schema-derived reference detail routes live
 * in docs-route-inventory-reference.ts; inventory assembly in
 * docs-route-inventory.ts.
 */
import type { DocsRouteMetadata } from "../apps/docs/src/lib/route-types.ts";
import { CLI_REFERENCE_OPTIONS } from "./cli-docs.ts";

type DocsRouteRecord = DocsRouteMetadata;

export const TOP_LEVEL_ROUTES: readonly DocsRouteRecord[] = [
  {
    path: "/",
    title: "ggsvelte — layered grammar of graphics for Svelte",
    description:
      "Layered grammar of graphics for Svelte: ggplot2-style aes, geoms, stats, and themes, with PortableSpec JSON and hybrid SVG/canvas rendering.",
    canonicalPath: "/",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/docs",
    title: "Documentation — ggsvelte",
    description: "Install, compose the grammar, add interaction, ship, and read public contracts.",
    canonicalPath: "/docs",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Start", label: "Overview", order: 0 },
  },
  {
    path: "/examples",
    title: "Gallery — ggsvelte",
    description: "Runnable ggsvelte examples across marks, stats, scales, and interaction.",
    canonicalPath: "/examples",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/themes",
    title: "Chart themes — ggsvelte",
    description: "Built-in chart themes for paper, grids, axes, and type.",
    canonicalPath: "/themes",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/palettes",
    title: "Color palettes — ggsvelte",
    description: "Categorical palettes and sequential color scales for data encoding.",
    canonicalPath: "/palettes",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/interactions",
    title: "Chart-local interaction — ggsvelte",
    description:
      "Inspect, select, zoom, and legend focus on a live chart. Semantic state is opt-in.",
    canonicalPath: "/interactions",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/reference",
    title: "Reference — ggsvelte",
    description: "Geom, interaction, CLI, diagnostic, lifecycle, and PortableSpec contracts.",
    canonicalPath: "/reference",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Reference overview", order: 50 },
  },
  {
    path: "/reference/geoms",
    title: "Geoms — ggsvelte",
    description:
      "Schema-derived API reference for every Geom* component: defaults, allowed stats and positions, and params.",
    canonicalPath: "/reference/geoms",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Geoms", order: 51 },
    headings: [
      { id: "all-geoms", title: "All geoms", level: 2 },
      { id: "shared-layer-props", title: "Shared layer props", level: 2 },
    ],
  },
  {
    path: "/reference/stats",
    title: "Stats — ggsvelte",
    description:
      "Schema-derived API reference for every statistical transform: after_stat columns and compatible geoms.",
    canonicalPath: "/reference/stats",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Stats", order: 52 },
    headings: [
      { id: "all-stats", title: "All stats", level: 2 },
      { id: "how-to-set", title: "How to set a stat", level: 2 },
    ],
  },
  {
    path: "/reference/positions",
    title: "Positions — ggsvelte",
    description:
      "Schema-derived API reference for every position adjustment: positionParams and compatible geoms.",
    canonicalPath: "/reference/positions",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Positions", order: 53 },
    headings: [
      { id: "all-positions", title: "All positions", level: 2 },
      { id: "how-to-set", title: "How to set a position", level: 2 },
    ],
  },
  {
    path: "/reference/interactions",
    title: "Search interactions — ggsvelte",
    description:
      "Filter ggsvelte interaction capabilities, events, diagnostics, and accessibility defaults.",
    canonicalPath: "/reference/interactions",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Interaction reference", order: 54 },
  },
  {
    path: "/reference/cli",
    title: "Command-line reference — ggsvelte",
    description:
      "Render PortableSpec JSON to SVG with implementation-derived flags, streams, diagnostics, and exit classes.",
    canonicalPath: "/reference/cli",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "CLI reference", order: 55 },
    headings: [
      { id: "input-and-output", title: "Input and output", level: 2 },
      { id: "options", title: "Options", level: 2 },
      ...CLI_REFERENCE_OPTIONS.map((option) => ({
        id: option.anchor,
        title: option.flag,
        level: 3,
      })),
      { id: "exit-codes", title: "Exit codes", level: 2 },
      { id: "troubleshooting", title: "Troubleshooting", level: 2 },
    ],
  },
];

export const ENDPOINT_ROUTES: readonly DocsRouteRecord[] = [
  ["/schema/v0.json", "PortableSpec JSON Schema", "Machine-readable ggsvelte PortableSpec schema."],
  ["/llms.txt", "ggsvelte documentation index", "A concise machine-readable documentation index."],
  [
    "/llms-full.txt",
    "Complete ggsvelte documentation",
    "Complete guide and example source for machine readers.",
  ],
  ["/sitemap.xml", "Sitemap", "Generated canonical route sitemap."],
  ["/robots.txt", "Robots policy", "Crawler policy and absolute sitemap location."],
].map(([path, title, description]) => ({
  path: path!,
  title: title!,
  description: description!,
  canonicalPath: path!,
  kind: "endpoint",
  index: false,
  sitemap: false,
  shell: "site",
}));

export const PERFORMANCE_ROUTES: readonly DocsRouteRecord[] = [
  "/__perf/r3-interaction",
  "/__perf/interaction-100k",
  "/__perf/legend-focus-100k",
].map((path) => ({
  path,
  title: "Performance fixture — ggsvelte",
  description: "Internal ggsvelte performance fixture; not part of the public documentation.",
  canonicalPath: path,
  kind: "performance",
  index: false,
  sitemap: false,
  shell: "site",
}));
