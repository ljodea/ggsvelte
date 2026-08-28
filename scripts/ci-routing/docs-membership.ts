/**
 * CI path routing — docs content-only membership and docs `$scripts` surface
 * parsing. Membership is an exact-equality check against the pattern tables in
 * patterns.ts (globs are inert there); parsing helpers are pure — no FS.
 */
import { DOCS_CONTENT_ONLY_PATHS, DOCS_CONTENT_SCRIPT_PATTERNS } from "./patterns";

const DOCS_CONTENT_ONLY = new Set(DOCS_CONTENT_ONLY_PATHS);
const DOCS_CONTENT_SCRIPTS = new Set(DOCS_CONTENT_SCRIPT_PATTERNS);

/** True when a path is docs content that must not force VR. */
export function isDocsContentOnlyPath(filePath: string): boolean {
  const path = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (DOCS_CONTENT_ONLY.has(path) || DOCS_CONTENT_SCRIPTS.has(path)) return true;
  // Content-only unit tests next to generators.
  if (path === "scripts/guide-section-id.test.ts") return true;
  return false;
}

/** Fail-closed: apps/docs paths not on the content allowlist are render-relevant. */
export function isDocsRenderPath(filePath: string): boolean {
  const path = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (isDocsContentOnlyPath(path)) return false;
  if (path === "apps/docs" || path.startsWith("apps/docs/")) return true;
  // Screenshots feed gallery pages and smoke VR inventory.
  if (path.startsWith("tests/visual/__screenshots__/")) return true;
  return false;
}

/**
 * Repo-relative `scripts/...` paths invoked via `bun …/scripts/<file>` in a
 * package.json `scripts` map (typically apps/docs). Pure — no FS.
 *
 * Covers every script value (not only build/check) so a future prepare script
 * is gated for free. Matches with or without trailing flags (`--check`).
 *
 * Scope: **direct invocation only**. Transitive helpers imported by those
 * scripts (e.g. docs-route-inventory, quickstart) still need hand lists or a
 * future module-graph derivation (#783 / follow-up).
 */
export function docsPackageInvokedScripts(scripts: Record<string, string>): string[] {
  // bun ../../scripts/foo.ts  |  bun scripts/foo.ts  |  bun ./scripts/foo.ts
  const re = /\bbun\s+(?:\.\.\/|\.\/)*scripts\/([^\s"'`;|&]+)/g;
  const found = new Set<string>();
  for (const value of Object.values(scripts)) {
    re.lastIndex = 0;
    for (const match of value.matchAll(re)) {
      const leaf = match[1];
      if (leaf === undefined || leaf.length === 0) continue;
      found.add(`scripts/${leaf}`);
    }
  }
  return [...found].toSorted();
}

/**
 * Repo-relative `scripts/<id>.ts` paths imported via the docs `$scripts/*`
 * alias. Pure — caller supplies source text.
 *
 * One-level import only (not the full module graph).
 */
export function docsSourceScriptImports(sourceText: string): string[] {
  const re = /from\s+["']\$scripts\/([^"']+)["']/g;
  const found = new Set<string>();
  for (const match of sourceText.matchAll(re)) {
    const id = match[1];
    if (id === undefined || id.length === 0) continue;
    const withExt = id.endsWith(".ts") || id.endsWith(".js") ? id : `${id}.ts`;
    found.add(`scripts/${withExt}`);
  }
  return [...found].toSorted();
}
