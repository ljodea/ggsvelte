import { EXAMPLES } from "../examples/manifest.ts";
import { EXAMPLE_ALIASES } from "../apps/docs/src/lib/example-aliases.ts";
import {
  INTERACTION_EXPOSITION_IDS,
  interactionExpositionSlug,
  isInteractionExposition,
} from "../apps/docs/src/lib/catalog/interaction-exposition.ts";
import { GUIDE_CATALOG, type GuideCatalogEntry } from "../apps/docs/src/lib/catalog/guide.ts";
import type { DocsRouteMetadata, RouteHeading } from "../apps/docs/src/lib/route-types.ts";
import { geomReferenceList } from "../packages/spec/src/geom-reference.ts";
import { statReferenceList } from "../packages/spec/src/stat-reference.ts";
import { CLI_REFERENCE_OPTIONS } from "./cli-docs.ts";

/** Script-side name for the shared route metadata contract (`DocsRouteMetadata`). */
export type DocsRouteRecord = DocsRouteMetadata;
export type {
  DocsRouteKind,
  DocsShell,
  RouteHeading,
  RouteNavigation,
} from "../apps/docs/src/lib/route-types.ts";

const TOP_LEVEL_ROUTES: readonly DocsRouteRecord[] = [
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
    title: "Geom reference — ggsvelte",
    description:
      "Schema-derived API reference for every Geom* component: defaults, allowed stats and positions, and params.",
    canonicalPath: "/reference/geoms",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Geom reference", order: 51 },
    headings: [
      { id: "all-geoms", title: "All geoms", level: 2 },
      { id: "shared-layer-props", title: "Shared layer props", level: 2 },
    ],
  },
  {
    path: "/reference/stats",
    title: "Stat reference — ggsvelte",
    description:
      "Schema-derived API reference for every statistical transform: after_stat columns and compatible geoms.",
    canonicalPath: "/reference/stats",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Stat reference", order: 52 },
    headings: [
      { id: "all-stats", title: "All stats", level: 2 },
      { id: "how-to-set", title: "How to set a stat", level: 2 },
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
    // order 53 reserved for /reference/positions (next follow-up)
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

/** Same matching rule as apps/docs reference/geoms/[name] page load. */
function geomHasRelatedExamples(geom: string): boolean {
  const compact = geom.replaceAll("_", "");
  const dashed = geom.replaceAll("_", "-");
  return EXAMPLES.some(
    (entry) =>
      entry.category === geom ||
      entry.category === compact ||
      entry.tags.includes(geom) ||
      entry.tags.includes(dashed),
  );
}

/** One indexable page per KNOWN_GEOMS entry, derived from SpecDeclarations. */
function geomDetailRoutes(): DocsRouteRecord[] {
  return geomReferenceList().map((entry) => {
    const headings: RouteHeading[] = [{ id: "defaults", title: "Defaults", level: 2 }];
    // Order matches apps/docs/src/routes/reference/geoms/[name]/+page.svelte.
    if (entry.aliasOf !== undefined) {
      headings.push({ id: "alias", title: "Alias", level: 2 });
    }
    headings.push(
      { id: "svelte", title: "Svelte component", level: 2 },
      { id: "json", title: "JSON layer", level: 2 },
      { id: "params", title: "Params", level: 2 },
      { id: "allowed-stats", title: "Allowed stats", level: 2 },
      { id: "allowed-positions", title: "Allowed positions", level: 2 },
    );
    if (geomHasRelatedExamples(entry.name)) {
      headings.push({ id: "examples", title: "Examples", level: 2 });
    }
    return {
      path: `/reference/geoms/${entry.slug}`,
      title: `${entry.component} — ggsvelte`,
      // Prefix with component so indexable descriptions stay unique when layer
      // summaries share phrasing across aliases or related marks.
      description: `${entry.component}: ${entry.summary}`,
      canonicalPath: `/reference/geoms/${entry.slug}`,
      kind: "page" as const,
      index: true,
      sitemap: true,
      shell: "docs" as const,
      headings,
    };
  });
}

/** Same matching rule as apps/docs reference/stats/[name] page load. */
function statHasRelatedExamples(stat: string): boolean {
  const compact = stat.replaceAll("_", "");
  const dashed = stat.replaceAll("_", "-");
  return EXAMPLES.some(
    (entry) =>
      entry.category === stat ||
      entry.category === compact ||
      entry.tags.includes(stat) ||
      entry.tags.includes(dashed) ||
      entry.tags.includes(`stat-${stat}`) ||
      entry.tags.includes(`stat_${stat}`),
  );
}

/** One indexable page per KNOWN_STATS entry. */
function statDetailRoutes(): DocsRouteRecord[] {
  return statReferenceList().map((entry) => {
    const headings: RouteHeading[] = [
      { id: "usage", title: "Usage", level: 2 },
      { id: "generated-columns", title: "Generated columns (after_stat)", level: 2 },
      { id: "default-for", title: "Default for geoms", level: 2 },
      { id: "compatible-geoms", title: "Compatible geoms", level: 2 },
    ];
    if (statHasRelatedExamples(entry.name)) {
      headings.push({ id: "examples", title: "Examples", level: 2 });
    }
    return {
      path: `/reference/stats/${entry.slug}`,
      title: `stat ${entry.name} — ggsvelte`,
      description: `stat "${entry.name}": ${entry.summary}`,
      canonicalPath: `/reference/stats/${entry.slug}`,
      kind: "page" as const,
      index: true,
      sitemap: true,
      shell: "docs" as const,
      headings,
    };
  });
}

const ENDPOINT_ROUTES: readonly DocsRouteRecord[] = [
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

const PERFORMANCE_ROUTES: readonly DocsRouteRecord[] = [
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

/** SEO meta needs a non-empty string; page lede may be empty (description deleted). */
function exampleSeoDescription(entry: {
  readonly title: string;
  readonly description: string;
}): string {
  return entry.description.trim() === "" ? entry.title : entry.description;
}

export function createDocsRouteInventory(): DocsRouteRecord[] {
  const guideCatalog: readonly GuideCatalogEntry[] = GUIDE_CATALOG;
  const guides: DocsRouteRecord[] = guideCatalog.map((entry) => ({
    path: `/guide/${entry.slug}`,
    title: `${entry.title} — ggsvelte`,
    description: entry.description,
    canonicalPath: `/guide/${entry.slug}`,
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    ...(entry.primaryNavigationOwner === undefined
      ? {}
      : { primaryNavigationOwner: entry.primaryNavigationOwner }),
    ...(entry.section === undefined
      ? {}
      : {
          navigation: {
            section: entry.section,
            label: entry.title,
            order: entry.navigationOrder,
          },
        }),
  }));

  const examples: DocsRouteRecord[] = EXAMPLES.filter(
    (entry) => !isInteractionExposition(entry.id),
  ).map((entry) => ({
    path: `/examples/${entry.id}`,
    title: `${entry.title} — ggsvelte gallery`,
    description: exampleSeoDescription(entry),
    canonicalPath: `/examples/${entry.id}`,
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  }));
  const interactionExpositions: DocsRouteRecord[] = INTERACTION_EXPOSITION_IDS.map((id) => {
    const entry = EXAMPLES.find((example) => example.id === id);
    if (entry === undefined) {
      throw new Error(`Missing interaction exposition in manifest: ${id}`);
    }
    const slug = interactionExpositionSlug(id)!;
    return {
      path: `/interactions/${slug}`,
      title: `${entry.title} — ggsvelte interactions`,
      description: exampleSeoDescription(entry),
      canonicalPath: `/interactions/${slug}`,
      kind: "page" as const,
      index: true,
      sitemap: true,
      shell: "site" as const,
    };
  });
  // Former gallery URLs for interaction expositions — full HTML aliases keep
  // stable deep links (noindex, canonical → /interactions/*); gallery excludes them.
  const expositionGalleryAliases: DocsRouteRecord[] = INTERACTION_EXPOSITION_IDS.map((id) => {
    const entry = EXAMPLES.find((example) => example.id === id);
    const slug = interactionExpositionSlug(id)!;
    return {
      path: `/examples/${id}`,
      title: `${entry?.title ?? "Interaction demo"} — ggsvelte interactions`,
      description: entry
        ? exampleSeoDescription(entry)
        : "A chart-local interaction demo relocated from the gallery to /interactions.",
      canonicalPath: `/interactions/${slug}`,
      kind: "alias" as const,
      index: false,
      sitemap: false,
      shell: "site" as const,
    };
  });
  const aliases: DocsRouteRecord[] = Object.entries(EXAMPLE_ALIASES).map(([alias, canonical]) => {
    const target = EXAMPLES.find((entry) => entry.id === canonical);
    const expositionSlug = interactionExpositionSlug(canonical);
    const isExposition = typeof expositionSlug === "string";
    const canonicalPath = isExposition
      ? `/interactions/${expositionSlug}`
      : `/examples/${canonical}`;
    return {
      path: `/examples/${alias}`,
      title: `${target?.title ?? "Example"} — ggsvelte ${isExposition ? "interactions" : "gallery"}`,
      description: target
        ? exampleSeoDescription(target)
        : "A legacy ggsvelte example route preserved for compatibility.",
      canonicalPath,
      kind: "alias" as const,
      index: false,
      sitemap: false,
      shell: "site" as const,
    };
  });

  return validateRouteInventory([
    ...TOP_LEVEL_ROUTES,
    ...geomDetailRoutes(),
    ...statDetailRoutes(),
    ...guides,
    ...examples,
    ...interactionExpositions,
    ...expositionGalleryAliases,
    ...aliases,
    ...ENDPOINT_ROUTES,
    ...PERFORMANCE_ROUTES,
  ]);
}

function fail(message: string): never {
  throw new Error(`Invalid docs route inventory: ${message}`);
}

export function validateRouteInventory<Route extends DocsRouteRecord>(routes: Route[]): Route[] {
  const byPath = new Map<string, Route>();
  const indexableTitles = new Map<string, string>();
  const indexableDescriptions = new Map<string, string>();
  for (const route of routes) {
    if (route.path !== "/" && (!route.path.startsWith("/") || route.path.endsWith("/"))) {
      fail(`route path must be an absolute path without a trailing slash: ${route.path}`);
    }
    if (!route.canonicalPath.startsWith("/")) {
      fail(`canonicalPath must be absolute for ${route.path}: ${route.canonicalPath}`);
    }
    if (route.title.trim() === "" || route.description.trim() === "") {
      fail(`title and description are required for ${route.path}`);
    }
    if (byPath.has(route.path)) fail(`duplicate path ${route.path}`);
    if (route.kind === "alias" && (route.index || route.sitemap)) {
      fail(`alias ${route.path} must be noindex and excluded from the sitemap`);
    }
    if (route.kind === "performance" && (route.index || route.sitemap)) {
      fail(`performance route ${route.path} must be noindex and excluded from the sitemap`);
    }
    if (route.sitemap && !route.index) fail(`${route.path} cannot enter the sitemap while noindex`);
    if (route.index) {
      const titleOwner = indexableTitles.get(route.title);
      if (titleOwner !== undefined) {
        fail(`duplicate indexable title for ${titleOwner} and ${route.path}: ${route.title}`);
      }
      const descriptionOwner = indexableDescriptions.get(route.description);
      if (descriptionOwner !== undefined) {
        fail(
          `duplicate indexable description for ${descriptionOwner} and ${route.path}: ${route.description}`,
        );
      }
      indexableTitles.set(route.title, route.path);
      indexableDescriptions.set(route.description, route.path);
    }
    byPath.set(route.path, route);
  }

  for (const route of routes) {
    if (route.kind !== "alias") continue;
    const seen = new Set([route.path]);
    let targetPath = route.canonicalPath;
    while (true) {
      const target = byPath.get(targetPath);
      if (target === undefined) fail(`alias ${route.path} targets missing route ${targetPath}`);
      if (target.kind !== "alias") break;
      if (seen.has(target.path))
        fail(`alias cycle includes ${[...seen, target.path].join(" -> ")}`);
      seen.add(target.path);
      targetPath = target.canonicalPath;
    }
  }

  return routes;
}

export function routeCanonicalUrl(route: DocsRouteRecord, canonicalBase: string): string {
  return `${canonicalBase.replace(/\/$/, "")}${route.canonicalPath}`;
}
