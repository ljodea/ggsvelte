import { DOCS_ROUTES, GUIDE_NAVIGATION } from "./generated/routes.js";
import type { DocsRouteMetadata } from "./route-types.js";

export { DOCS_ROUTES, GUIDE_NAVIGATION };

const ROUTES: readonly DocsRouteMetadata[] = DOCS_ROUTES;
const ROUTES_BY_PATH = new Map<string, DocsRouteMetadata>(
  ROUTES.map((route) => [route.path, route]),
);

export function routePath(pathname: string, base: string): string {
  const hasBaseBoundary = base !== "" && (pathname === base || pathname.startsWith(`${base}/`));
  const withoutBase = hasBaseBoundary ? pathname.slice(base.length) : pathname;
  const path = withoutBase === "" ? "/" : withoutBase;
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function findDocsRoute(path: string): DocsRouteMetadata | undefined {
  return ROUTES_BY_PATH.get(path);
}

export function canonicalUrl(route: DocsRouteMetadata, canonicalBase: string): string {
  return `${canonicalBase.replace(/\/$/, "")}${route.canonicalPath}`;
}

export function sitemapRoutes(): DocsRouteMetadata[] {
  return ROUTES.filter((route) => route.sitemap);
}

export function guideSequence(path: string): {
  previous?: DocsRouteMetadata;
  next?: DocsRouteMetadata;
} {
  const guides = ROUTES.filter((route) => route.navigation !== undefined).toSorted(
    (a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0),
  );
  const index = guides.findIndex((route) => route.path === path);
  if (index < 0) return {};
  const previous = guides[index - 1];
  const next = guides[index + 1];
  return {
    ...(previous !== undefined && { previous }),
    ...(next !== undefined && { next }),
  };
}
