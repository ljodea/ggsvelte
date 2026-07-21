export type LegacyRouteSource = "canonical" | "alias" | "sitemap" | "live-crawl";
export type LegacyRouteKind = "page" | "alias" | "endpoint" | "performance" | "crawl";

export interface LegacyRouteInput {
  readonly path: string;
  readonly canonicalPath: string;
  readonly kind: string;
  readonly sitemap: boolean;
}

export interface LegacyCrawlEvidence {
  readonly crawledAt: string;
  readonly crawlOrigin: string;
  readonly sitemapPaths: readonly string[];
  readonly discoveredPaths: readonly string[];
}

export interface LegacyRouteMapping {
  readonly sourcePath: string;
  readonly destinationPath: string;
  readonly kind: LegacyRouteKind;
  readonly sources: readonly LegacyRouteSource[];
}

export interface LegacyRouteInventory {
  readonly schemaVersion: 1;
  readonly sourceOrigin: "https://ljodea.github.io/ggsvelte";
  readonly destinationOrigin: "https://ggsvelte.sh";
  readonly crawledAt: string;
  readonly benchmarkPrefix: "/bench";
  readonly routes: readonly LegacyRouteMapping[];
}

const SOURCE_ORDER: readonly LegacyRouteSource[] = ["canonical", "alias", "sitemap", "live-crawl"];

function assertPath(path: string, source: string): void {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new Error(`Invalid ${source} legacy path: ${path}`);
  }
  const segments = decoded.replaceAll("\\", "/").split("/");
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("://") ||
    path.includes("\\") ||
    segments.includes("..")
  ) {
    throw new Error(`Invalid ${source} legacy path: ${path}`);
  }
}

function routeKind(kind: string): LegacyRouteKind {
  if (kind === "alias" || kind === "endpoint" || kind === "performance") return kind;
  return "page";
}

export function createLegacyRouteInventory(
  routes: readonly LegacyRouteInput[],
  crawl: LegacyCrawlEvidence,
): LegacyRouteInventory {
  if (crawl.crawlOrigin !== "https://ljodea.github.io/ggsvelte") {
    throw new Error(`Unexpected pre-cutover crawl origin: ${crawl.crawlOrigin}`);
  }
  const mappings = new Map<
    string,
    { destinationPath: string; kind: LegacyRouteKind; sources: Set<LegacyRouteSource> }
  >();
  const add = (
    sourcePath: string,
    destinationPath: string,
    kind: LegacyRouteKind,
    source: LegacyRouteSource,
  ) => {
    assertPath(sourcePath, source);
    assertPath(destinationPath, `${source} destination`);
    if (sourcePath === "/bench" || sourcePath.startsWith("/bench/")) return;
    const existing = mappings.get(sourcePath);
    if (existing !== undefined && existing.destinationPath !== destinationPath) {
      throw new Error(
        `Conflicting legacy destinations for ${sourcePath}: ${existing.destinationPath} and ${destinationPath}`,
      );
    }
    const mapping = existing ?? { destinationPath, kind, sources: new Set<LegacyRouteSource>() };
    mapping.sources.add(source);
    mappings.set(sourcePath, mapping);
  };

  for (const route of routes) {
    add(
      route.path,
      route.canonicalPath,
      routeKind(route.kind),
      route.kind === "alias" ? "alias" : "canonical",
    );
  }
  for (const path of crawl.sitemapPaths) add(path, path, "page", "sitemap");
  for (const path of crawl.discoveredPaths) {
    const existing = mappings.get(path);
    add(path, existing?.destinationPath ?? path, existing?.kind ?? "crawl", "live-crawl");
  }

  return {
    schemaVersion: 1,
    sourceOrigin: "https://ljodea.github.io/ggsvelte",
    destinationOrigin: "https://ggsvelte.sh",
    crawledAt: crawl.crawledAt,
    benchmarkPrefix: "/bench",
    routes: [...mappings.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([sourcePath, mapping]) => ({
        sourcePath,
        destinationPath: mapping.destinationPath,
        kind: mapping.kind,
        sources: SOURCE_ORDER.filter((source) => mapping.sources.has(source)),
      })),
  };
}
