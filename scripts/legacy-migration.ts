import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { LegacyRouteInventory, LegacyRouteMapping } from "./legacy-routes.ts";

const DESTINATION_ORIGIN = "https://ggsvelte.sh";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function migrationShell(title: string, head: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>${escapeHtml(title)}</title>
  ${head}
  <style>body{max-width:42rem;margin:12vh auto;padding:0 1.5rem;font:1.1rem/1.6 system-ui,sans-serif;color:#24221f;background:#faf8f3}a{color:#145a73;font-weight:700}code{font-size:.9em}</style>
</head>
<body>
  ${body}
</body>
</html>
`;
}

export function renderLegacyMigrationPage(route: LegacyRouteMapping): string {
  const target = `${DESTINATION_ORIGIN}${route.destinationPath === "/" ? "/" : route.destinationPath}`;
  const escapedTarget = escapeHtml(target);
  const head = `<link rel="canonical" href="${escapedTarget}">
  <meta http-equiv="refresh" content="0;url=${escapedTarget}">`;
  const body = `<main>
    <h1>ggsvelte documentation moved</h1>
    <p>This page now lives at <a href="${escapedTarget}">${escapedTarget}</a>.</p>
    <p>If the redirect does not start, follow the link above.</p>
  </main>
  <script>
    (function () {
      var suffix = location.search + location.hash;
      location.replace(${JSON.stringify(target)} + suffix);
    })();
  </script>`;
  return migrationShell("ggsvelte documentation moved", head, body);
}

export function renderLegacyNotFoundPage(): string {
  return migrationShell(
    "Page not found — ggsvelte documentation moved",
    '<link rel="canonical" href="https://ggsvelte.sh/">',
    `<main>
    <h1>This old documentation path was not found</h1>
    <p>The current ggsvelte documentation is at <a href="https://ggsvelte.sh/">ggsvelte.sh</a>.</p>
  </main>`,
  );
}

function htmlPath(buildDirectory: string, routePath: string): string {
  return routePath === "/"
    ? join(buildDirectory, "index.html")
    : join(buildDirectory, `${routePath.slice(1)}.html`);
}

export function applyLegacyMigration(
  buildDirectory: string,
  inventory: LegacyRouteInventory,
): void {
  if (inventory.destinationOrigin !== DESTINATION_ORIGIN) {
    throw new Error(
      `Unexpected legacy migration destination: ${String(inventory.destinationOrigin)}`,
    );
  }
  for (const route of inventory.routes) {
    if (route.kind === "endpoint") continue;
    const path = htmlPath(buildDirectory, route.sourcePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, renderLegacyMigrationPage(route));
  }
  writeFileSync(join(buildDirectory, "404.html"), renderLegacyNotFoundPage());
}

function main(): void {
  const root = join(import.meta.dir, "..");
  const buildDirectory = join(root, "apps", "docs", "build");
  const inventoryPath = join(root, "apps", "docs", "deployment", "legacy-routes.json");
  if (!existsSync(buildDirectory)) throw new Error(`Docs build is missing: ${buildDirectory}`);
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as LegacyRouteInventory;
  applyLegacyMigration(buildDirectory, inventory);
  console.log(`generated ${String(inventory.routes.length)} legacy route migrations`);
}

if (import.meta.main) main();
