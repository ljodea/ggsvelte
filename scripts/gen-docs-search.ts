import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { format } from "oxfmt";

import { DOCS_ROUTES } from "../apps/docs/src/lib/generated/routes.ts";
import type { DocsRouteMetadata } from "../apps/docs/src/lib/route-types.ts";
import type { DocsSearchEntry } from "../apps/docs/src/lib/search-types.ts";
import { EXAMPLES } from "../examples/manifest.ts";
import lifecycle from "../lifecycle.json";
import { CLI_REFERENCE_OPTIONS } from "./cli-docs.ts";
import { buildDiagnosticDocs } from "./diagnostic-docs.ts";

export type { DocsSearchEntry } from "../apps/docs/src/lib/search-types.ts";

const SEARCH_EXACT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "/guide/scales-guides#date-and-time-axes": ["date axis"],
  "/guide/inspect-pin": ["tooltip"],
  "/guide/server-rendering-export": ["server render"],
  "/guide/rendering-performance#canvas-and-interaction": ["canvas selection"],
};

const OUTPUT_PATH = join(
  import.meta.dir,
  "..",
  "apps",
  "docs",
  "src",
  "lib",
  "generated",
  "search-index.ts",
);

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function routeId(path: string): string {
  return path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
}

function cleanTitle(title: string): string {
  return title.replace(/ — ggsvelte(?: gallery)?$/, "");
}

function lifecycleAnchor(packageName: string, entry: string): string {
  return slug(`${packageName}${entry === "." ? "" : ` ${entry}`}`);
}

export function createDocsSearchEntries(): DocsSearchEntry[] {
  const entries: DocsSearchEntry[] = [];

  const routes: readonly DocsRouteMetadata[] = DOCS_ROUTES;
  for (const route of routes) {
    if (!route.index || route.kind !== "page" || route.path.startsWith("/examples/")) continue;
    const pageTitle = cleanTitle(route.title);
    entries.push({
      id: `page:${routeId(route.path)}`,
      kind: "page",
      title: pageTitle,
      summary: route.description,
      href: route.path,
      keywords: route.navigation === undefined ? [] : [route.navigation.section],
      exact: [pageTitle, ...(SEARCH_EXACT_ALIASES[route.path] ?? [])],
    });
    for (const heading of route.headings ?? []) {
      if (route.path === "/reference/cli" && heading.level === 3) continue;
      entries.push({
        id: `heading:${routeId(route.path)}:${heading.id}`,
        kind: "heading",
        title: heading.title,
        summary: `${heading.title} in ${pageTitle}. ${route.description}`,
        href: `${route.path}#${heading.id}`,
        keywords: [pageTitle, route.navigation?.section ?? "documentation"],
        exact: [heading.title, ...(SEARCH_EXACT_ALIASES[`${route.path}#${heading.id}`] ?? [])],
      });
    }
  }

  for (const example of EXAMPLES) {
    entries.push({
      id: `example:${example.id.replaceAll("/", ":")}`,
      kind: "example",
      title: example.title,
      summary: example.description,
      href: `/examples/${example.id}`,
      keywords: [example.title, example.docsSection, ...example.tags],
      exact: [example.title],
    });
  }

  for (const surface of lifecycle.surfaces) {
    const anchor = lifecycleAnchor(surface.package, surface.entry);
    for (const [name, metadata] of Object.entries(surface.exports)) {
      entries.push({
        id: `api:${anchor}:${name}`,
        kind: "api",
        title: name,
        summary: `${surface.package}${surface.entry === "." ? "" : ` ${surface.entry}`} · ${metadata.kind} · ${metadata.lifecycle}.`,
        href: `/guide/lifecycle#${anchor}`,
        keywords: [surface.package, surface.entry, metadata.kind, metadata.lifecycle],
        exact: [name],
      });
    }
  }
  for (const tag of lifecycle.tags) {
    entries.push({
      id: `lifecycle:${tag}`,
      kind: "lifecycle",
      title: tag,
      summary: `Public API lifecycle label: ${tag}.`,
      href: "/guide/lifecycle#lifecycle-tags",
      keywords: ["stability", "upgrade", "public API"],
      exact: [tag],
    });
  }

  for (const diagnostic of buildDiagnosticDocs()) {
    entries.push({
      id: `diagnostic:${diagnostic.source}:${diagnostic.code}`,
      kind: "diagnostic",
      title: `${diagnostic.code} · ${diagnostic.source}`,
      summary: diagnostic.why,
      href: `/guide/errors#${diagnostic.anchor}`,
      keywords: [diagnostic.source, diagnostic.severity, diagnostic.fix],
      exact: [diagnostic.code, `${diagnostic.source}:${diagnostic.code}`],
    });
  }

  for (const option of CLI_REFERENCE_OPTIONS) {
    entries.push({
      id: `cli:${option.anchor}`,
      kind: "cli",
      title: option.flag,
      summary: option.description,
      href: `/reference/cli#${option.anchor}`,
      keywords: [option.value, ...option.aliases, option.detail ?? ""].filter(Boolean),
      exact: [option.flag, ...option.aliases],
    });
  }

  return validateDocsSearchEntries(entries);
}

export function validateDocsSearchEntries<Entry extends DocsSearchEntry>(
  entries: Entry[],
): Entry[] {
  const routes: readonly DocsRouteMetadata[] = DOCS_ROUTES;
  const publicRoutes = new Map(
    routes
      .filter((route) => route.index && route.kind === "page")
      .map((route) => [route.path, route] as const),
  );
  const cliAnchors = new Set(CLI_REFERENCE_OPTIONS.map((option) => option.anchor));
  const ids = new Set<string>();
  const hrefTitles = new Set<string>();
  for (const entry of entries) {
    if (entry.id.trim() === "" || entry.title.trim() === "" || entry.summary.trim() === "") {
      throw new Error(`Invalid docs search entry ${entry.id || "(missing id)"}: text is required`);
    }
    if (ids.has(entry.id)) throw new Error(`Invalid docs search index: duplicate id ${entry.id}`);
    ids.add(entry.id);
    const hrefTitle = `${entry.href}\u0000${entry.title}`;
    if (hrefTitles.has(hrefTitle)) {
      throw new Error(
        `Invalid docs search index: duplicate href/title ${entry.href} ${entry.title}`,
      );
    }
    hrefTitles.add(hrefTitle);
    if (!entry.href.startsWith("/") || entry.href.startsWith("/__perf/")) {
      throw new Error(`Invalid docs search index: href must be public: ${entry.href}`);
    }
    const hrefParts = entry.href.split("#");
    if (hrefParts.length > 2) {
      throw new Error(`Invalid docs search index: malformed anchor in ${entry.href}`);
    }
    const [path, anchor] = hrefParts;
    const route = publicRoutes.get(path!);
    if (route === undefined) {
      throw new Error(
        `Invalid docs search index: href must target an indexed route: ${entry.href}`,
      );
    }
    if (anchor !== undefined) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(anchor)) {
        throw new Error(`Invalid docs search index: malformed anchor in ${entry.href}`);
      }
      const found =
        route.headings?.some((heading) => heading.id === anchor) === true ||
        (path === "/reference/cli" && cliAnchors.has(anchor));
      if (!found) {
        throw new Error(`Invalid docs search index: missing anchor in ${entry.href}`);
      }
    }
    if (entry.href.includes("/examples/interactions/")) {
      throw new Error(
        `Invalid docs search index: alias href is not public canonical: ${entry.href}`,
      );
    }
  }
  return entries;
}

export async function generateDocsSearchProjection(
  entries: readonly DocsSearchEntry[],
): Promise<string> {
  const source = `// Generated by bun scripts/gen-docs-search.ts — do not edit.\nimport type { DocsSearchEntry } from "../search-types.js";\n\nexport const DOCS_SEARCH_INDEX = ${JSON.stringify(entries, null, 2)} as const satisfies readonly DocsSearchEntry[];\n`;
  const result = await format(OUTPUT_PATH, source);
  if (result.errors.length > 0) {
    throw new Error(
      `Could not format generated Docs search: ${result.errors[0]?.message ?? "unknown error"}`,
    );
  }
  return result.code;
}

export async function generateDocsSearch(check = false): Promise<void> {
  const output = await generateDocsSearchProjection(createDocsSearchEntries());
  if (check) {
    const existing = readFileSync(OUTPUT_PATH, "utf8");
    if (existing !== output) {
      throw new Error("Generated Docs search index is stale. Run `bun run docs:search:gen`.");
    }
    console.log("docs search index is current");
    return;
  }
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, output);
  console.log(`wrote ${OUTPUT_PATH}`);
}

if (import.meta.main || import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await generateDocsSearch(process.argv.includes("--check"));
}
