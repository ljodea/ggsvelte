import { EXAMPLES } from "../examples/manifest.ts";
import { EXAMPLE_ALIASES } from "../apps/docs/src/lib/example-aliases.ts";
import { GUIDE_CATALOG, type GuideCatalogEntry } from "../apps/docs/src/lib/catalog/guide.ts";
import type { DocsRouteMetadata } from "../apps/docs/src/lib/route-types.ts";
import {
  ENDPOINT_ROUTES,
  PERFORMANCE_ROUTES,
  TOP_LEVEL_ROUTES,
} from "./docs-route-inventory-pages.ts";
import {
  geomDetailRoutes,
  guideDetailRoutes,
  positionDetailRoutes,
  scaleDetailRoutes,
  statDetailRoutes,
} from "./docs-route-inventory-reference.ts";

/** Script-side name for the shared route metadata contract (`DocsRouteMetadata`). */
export type DocsRouteRecord = DocsRouteMetadata;
export type {
  DocsRouteKind,
  DocsShell,
  RouteHeading,
  RouteNavigation,
} from "../apps/docs/src/lib/route-types.ts";

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

  // All corpus entries (including interaction expositions) are real pages at
  // /examples/*; gallery listing still excludes expositions separately.
  const examples: DocsRouteRecord[] = EXAMPLES.map((entry) => ({
    path: `/examples/${entry.id}`,
    title: `${entry.title} — ggsvelte gallery`,
    description: exampleSeoDescription(entry),
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
      description: target
        ? exampleSeoDescription(target)
        : "A legacy ggsvelte example route preserved for compatibility.",
      canonicalPath: `/examples/${canonical}`,
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
    ...positionDetailRoutes(),
    ...scaleDetailRoutes(),
    ...guideDetailRoutes(),
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
