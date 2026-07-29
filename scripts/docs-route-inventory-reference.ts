/**
 * Schema-derived geom / stat / position reference detail routes for the docs
 * inventory. Matching rules mirror apps/docs reference/[kind]/[name] loaders.
 */
import { EXAMPLES } from "../examples/manifest.ts";
import type { DocsRouteMetadata, RouteHeading } from "../apps/docs/src/lib/route-types.ts";
import { geomReferenceList } from "../packages/spec/src/geom-reference.ts";
import { guideReferenceList } from "../packages/spec/src/guide-reference.ts";
import { positionReferenceList } from "../packages/spec/src/position-reference.ts";
import { statReferenceList } from "../packages/spec/src/stat-reference.ts";

type DocsRouteRecord = DocsRouteMetadata;

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
export function geomDetailRoutes(): DocsRouteRecord[] {
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
export function statDetailRoutes(): DocsRouteRecord[] {
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

/** Same matching rule as apps/docs reference/positions/[name] page load. */
function positionHasRelatedExamples(position: string): boolean {
  return EXAMPLES.some(
    (entry) =>
      entry.tags.includes(position) ||
      entry.tags.includes(`position-${position}`) ||
      entry.tags.includes(`position_${position}`) ||
      entry.id.includes(position),
  );
}

/** One indexable page per KNOWN_POSITIONS entry. */
export function positionDetailRoutes(): DocsRouteRecord[] {
  return positionReferenceList().map((entry) => {
    const headings: RouteHeading[] = [
      { id: "usage", title: "Usage", level: 2 },
      { id: "params", title: "positionParams", level: 2 },
      { id: "default-for", title: "Default for geoms", level: 2 },
      { id: "compatible-geoms", title: "Compatible geoms", level: 2 },
    ];
    if (positionHasRelatedExamples(entry.name)) {
      headings.push({ id: "examples", title: "Examples", level: 2 });
    }
    return {
      path: `/reference/positions/${entry.slug}`,
      title: `position ${entry.name} — ggsvelte`,
      description: `position "${entry.name}": ${entry.summary}`,
      canonicalPath: `/reference/positions/${entry.slug}`,
      kind: "page" as const,
      index: true,
      sitemap: true,
      shell: "docs" as const,
      headings,
    };
  });
}

/** One indexable page per KNOWN_GUIDE_TYPES entry. */
export function guideDetailRoutes(): DocsRouteRecord[] {
  return guideReferenceList().map((entry) => {
    const headings: RouteHeading[] = [
      { id: "channels", title: "Channels", level: 2 },
      { id: "svelte", title: "Svelte component", level: 2 },
      { id: "json", title: "JSON and helpers", level: 2 },
      { id: "props", title: "Props", level: 2 },
    ];
    if (entry.name === "legend") {
      headings.push({ id: "legend-focus", title: "Legend focus", level: 2 });
    }
    return {
      path: `/reference/guides/${entry.slug}`,
      title: `${entry.component} — ggsvelte`,
      description: `${entry.component}: ${entry.summary}`,
      canonicalPath: `/reference/guides/${entry.slug}`,
      kind: "page" as const,
      index: true,
      sitemap: true,
      shell: "docs" as const,
      headings,
    };
  });
}
