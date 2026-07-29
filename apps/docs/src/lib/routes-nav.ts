/**
 * Client-safe route navigation surface.
 *
 * Imports only GUIDE_NAVIGATION from the generated projection — never
 * DOCS_ROUTES (~120KB of per-route metadata). Server load already serializes
 * the current route onto page data; chrome only needs the guide sidebar map
 * and a pure helper for primary-nav ownership.
 */
import { GUIDE_NAVIGATION } from "./generated/routes.js";
import type { DocsRouteMetadata } from "./route-types.js";

export { GUIDE_NAVIGATION };

export type PrimaryNavigationOwner = "docs" | "reference";

export function primaryNavigationOwner(
  route: DocsRouteMetadata | undefined,
): PrimaryNavigationOwner | undefined {
  if (route === undefined) return undefined;
  if (
    route.primaryNavigationOwner === "reference" ||
    route.path.startsWith("/reference") ||
    route.navigation?.section === "Reference"
  ) {
    return "reference";
  }
  return route.shell === "docs" ? "docs" : undefined;
}
