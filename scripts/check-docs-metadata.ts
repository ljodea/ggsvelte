import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { resolveDocsBuildConfig, type DocsBuildConfig } from "../apps/docs/build-mode.ts";
import {
  createDocsRouteInventory,
  routeCanonicalUrl,
  type DocsRouteRecord,
} from "./docs-route-inventory.ts";

function fail(message: string): never {
  throw new Error(`Docs metadata check failed: ${message}`);
}

function htmlPath(buildDir: string, routePath: string): string {
  return routePath === "/"
    ? join(buildDir, "index.html")
    : join(buildDir, `${routePath.slice(1)}.html`);
}

function matches(html: string, pattern: RegExp): string[] {
  return html.match(pattern) ?? [];
}

function listHtmlFiles(root: string, directory = root): string[] {
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    if (statSync(absolute).isDirectory()) return listHtmlFiles(root, absolute);
    return absolute.endsWith(".html") ? [absolute.slice(root.length + 1)] : [];
  });
}

export function validateDocsBuildMetadata(
  buildDir: string,
  config: DocsBuildConfig,
  routes: readonly DocsRouteRecord[],
): void {
  const pageRoutes = routes.filter((route) => route.kind !== "endpoint");
  const actualFiles = listHtmlFiles(buildDir).toSorted();
  const expectedFiles = pageRoutes
    .map((route) => htmlPath(buildDir, route.path).slice(buildDir.length + 1))
    .toSorted();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    fail("built HTML routes do not match the route inventory");
  }

  for (const route of pageRoutes) {
    const path = htmlPath(buildDir, route.path);
    const html = readFileSync(path, "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    const titles = matches(head, /<title>[^<]*<\/title>/g);
    const descriptions = matches(head, /<meta name="description" content="[^"]*"\s*\/>/g);
    const canonicals = matches(head, /<link rel="canonical" href="[^"]*"\s*\/>/g);
    const robots = matches(head, /<meta name="robots" content="[^"]*"\s*\/>/g);
    if (titles.length !== 1) fail(`${route.path} has ${String(titles.length)} title tags`);
    if (descriptions.length !== 1)
      fail(`${route.path} has ${String(descriptions.length)} descriptions`);
    if (canonicals.length !== 1) fail(`${route.path} has ${String(canonicals.length)} canonicals`);
    const canonical = routeCanonicalUrl(route, config.canonicalBase);
    if (!canonicals[0]!.includes(`href="${canonical}"`)) {
      fail(`${route.path} canonical does not match ${canonical}`);
    }
    const shouldNoindex = !config.indexable || !route.index;
    if (robots.length !== (shouldNoindex ? 1 : 0)) {
      fail(`${route.path} robots policy does not match mode ${config.mode}`);
    }
  }

  const sitemap = readFileSync(join(buildDir, "sitemap.xml"), "utf8");
  const actualUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);
  const expectedUrls = routes
    .filter((route) => route.sitemap)
    .map((route) => routeCanonicalUrl(route, config.canonicalBase));
  if (JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)) {
    fail("sitemap URLs do not match the canonical route inventory");
  }

  const robots = readFileSync(join(buildDir, "robots.txt"), "utf8");
  const expectedPolicy = config.indexable ? "Allow: /" : "Disallow: /";
  if (!robots.includes(expectedPolicy)) fail(`robots.txt is missing ${expectedPolicy}`);
  if (!robots.includes(`Sitemap: ${config.canonicalBase}/sitemap.xml`)) {
    fail("robots.txt is missing the absolute mode-specific sitemap URL");
  }
}

if (import.meta.main) {
  const mode = process.env["DOCS_BUILD_MODE"];
  const basePath = process.env["BASE_PATH"];
  const config = resolveDocsBuildConfig({
    ...(mode !== undefined && { mode }),
    ...(basePath !== undefined && { basePath }),
  });
  validateDocsBuildMetadata(
    join(import.meta.dir, "..", "apps", "docs", "build"),
    config,
    createDocsRouteInventory(),
  );
  console.log(`docs metadata is valid for ${config.mode}`);
}
