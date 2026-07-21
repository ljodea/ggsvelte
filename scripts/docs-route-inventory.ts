import { EXAMPLES } from "../examples/manifest.ts";
import { EXAMPLE_ALIASES } from "../apps/docs/src/lib/example-aliases.ts";
import { CLI_REFERENCE_OPTIONS } from "./cli-docs.ts";
import { GUIDE_CATALOG, type GuideCatalogEntry } from "../apps/docs/src/lib/catalog/guide.ts";

export type DocsRouteKind = "page" | "alias" | "endpoint" | "performance";
export type DocsShell = "site" | "docs";

export interface RouteNavigation {
  section: string;
  label: string;
  order: number;
}

export interface RouteHeading {
  id: string;
  title: string;
  level: number;
}

export interface DocsRouteRecord {
  path: string;
  title: string;
  description: string;
  canonicalPath: string;
  kind: DocsRouteKind;
  index: boolean;
  sitemap: boolean;
  shell: DocsShell;
  navigation?: RouteNavigation;
  primaryNavigationOwner?: "reference";
  headings?: RouteHeading[];
}

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
    path: "/playground",
    title: "PortableSpec playground — ggsvelte",
    description:
      "Edit a bounded PortableSpec locally. Export Svelte, builder TypeScript, JSON, or SVG.",
    canonicalPath: "/playground",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/themes",
    title: "Chart themes and color scales — ggsvelte",
    description:
      "Built-in chart themes, categorical schemes, sequential ramps, and interaction role colors.",
    canonicalPath: "/themes",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  },
  {
    path: "/reference",
    title: "Reference — ggsvelte",
    description: "Interaction, CLI, diagnostic, lifecycle, and PortableSpec contracts.",
    canonicalPath: "/reference",
    kind: "page",
    index: true,
    sitemap: true,
    shell: "docs",
    navigation: { section: "Reference", label: "Reference overview", order: 50 },
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
    navigation: { section: "Reference", label: "Interaction reference", order: 51 },
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
    navigation: { section: "Reference", label: "CLI reference", order: 52 },
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
  const examples: DocsRouteRecord[] = EXAMPLES.map((entry) => ({
    path: `/examples/${entry.id}`,
    title: `${entry.title} — ggsvelte gallery`,
    description: entry.description,
    canonicalPath: `/examples/${entry.id}`,
    kind: "page",
    index: true,
    sitemap: true,
    shell: "site",
  }));
  const aliases: DocsRouteRecord[] = Object.entries(EXAMPLE_ALIASES).map(([alias, canonical]) => {
    const target = EXAMPLES.find((entry) => entry.id === canonical);
    return {
      path: `/examples/${alias}`,
      title: `${target?.title ?? "Example"} — ggsvelte gallery`,
      description:
        target?.description ?? "A legacy ggsvelte example route preserved for compatibility.",
      canonicalPath: `/examples/${canonical}`,
      kind: "alias",
      index: false,
      sitemap: false,
      shell: "site",
    };
  });

  return validateRouteInventory([
    ...TOP_LEVEL_ROUTES,
    ...guides,
    ...examples,
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
