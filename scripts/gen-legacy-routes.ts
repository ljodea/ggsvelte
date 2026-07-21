import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { format } from "oxfmt";

import { createDocsRouteInventory } from "./docs-route-inventory.ts";
import { createLegacyRouteInventory } from "./legacy-routes.ts";

const DEPLOYMENT_DIRECTORY = join(import.meta.dir, "..", "apps", "docs", "deployment");
const CRAWL_PATH = join(DEPLOYMENT_DIRECTORY, "precutover-crawl.json");
const OUTPUT_PATH = join(DEPLOYMENT_DIRECTORY, "legacy-routes.json");
const LEGACY_BASE = "/ggsvelte";

interface CrawlFile {
  readonly origin: string;
  readonly crawledAt: string;
  readonly sitemapCount: number;
  readonly pageStatuses: Readonly<Record<string, number>>;
  readonly discoveredPaths: readonly string[];
}

function projectPath(path: string): string {
  if (path === `${LEGACY_BASE}/`) return "/";
  if (!path.startsWith(`${LEGACY_BASE}/`)) {
    throw new Error(`Pre-cutover sitemap path is outside ${LEGACY_BASE}: ${path}`);
  }
  return path.slice(LEGACY_BASE.length);
}

export async function generateLegacyRoutes(): Promise<string> {
  const crawl = JSON.parse(readFileSync(CRAWL_PATH, "utf8")) as CrawlFile;
  const sitemapEntries = Object.entries(crawl.pageStatuses);
  if (sitemapEntries.length !== crawl.sitemapCount) {
    throw new Error(
      `Pre-cutover sitemap count mismatch: expected ${String(crawl.sitemapCount)}, found ${String(sitemapEntries.length)}`,
    );
  }
  const failed = sitemapEntries.filter(([, status]) => status !== 200);
  if (failed.length > 0) {
    throw new Error(`Pre-cutover crawl contains non-200 routes: ${JSON.stringify(failed)}`);
  }
  const inventory = createLegacyRouteInventory(createDocsRouteInventory(), {
    crawledAt: crawl.crawledAt,
    crawlOrigin: crawl.origin,
    sitemapPaths: sitemapEntries.map(([path]) => projectPath(path)),
    discoveredPaths: crawl.discoveredPaths,
  });
  const result = await format(OUTPUT_PATH, `${JSON.stringify(inventory, null, 2)}\n`);
  if (result.errors.length > 0) {
    throw new Error(
      `Could not format frozen legacy routes: ${result.errors[0]?.message ?? "unknown error"}`,
    );
  }
  return result.code;
}

export async function writeLegacyRoutes(check = false): Promise<void> {
  const output = await generateLegacyRoutes();
  if (check) {
    if (readFileSync(OUTPUT_PATH, "utf8") !== output) {
      throw new Error("Frozen legacy routes are stale. Run `bun run legacy:routes:gen`.");
    }
    console.log("frozen legacy route inventory is current");
    return;
  }
  writeFileSync(OUTPUT_PATH, output);
  console.log(`wrote ${OUTPUT_PATH}`);
}

if (import.meta.main || import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await writeLegacyRoutes(process.argv.includes("--check"));
}
