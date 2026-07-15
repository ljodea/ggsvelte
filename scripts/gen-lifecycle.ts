/**
 * gen-lifecycle — generates lifecycle.json from the packages' public index
 * files (Hadley lesson 13: lifecycle tags on every public export).
 *
 * Tag sources, in precedence order:
 *   1. a trailing `// @lifecycle <tag>` comment on a name inside an export
 *      brace list;
 *   2. a `/** @lifecycle <tag> *\/` JSDoc comment immediately before an
 *      export statement (applies to every name in that statement);
 *   3. the file default declared as `// @lifecycle-default <tag>` in the
 *      file's header comment (required — a file without one is an error).
 *
 * Tags (meanings documented in CONTRIBUTING.md): "experimental",
 * "stable-intent", "stable", "superseded". At 0.1.0 everything is
 * experimental except the agent core path (PortableSpec / normalize /
 * validate / renderToSVGString / GGPlot and their direct result contracts),
 * which is stable-intent.
 *
 * Usage:
 *   bun scripts/gen-lifecycle.ts           # (re)write lifecycle.json
 *   bun scripts/gen-lifecycle.ts --check   # exit 1 if the file is stale
 *     (gen-lifecycle.test.ts also asserts staleness in CI)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const LIFECYCLE_TAGS = ["experimental", "stable-intent", "stable", "superseded"] as const;
export type LifecycleTag = (typeof LIFECYCLE_TAGS)[number];

/** The index files defining each package's public surface. */
export const SURFACES: readonly { pkg: string; entry: string; file: string }[] = [
  { pkg: "@ggsvelte/spec", entry: ".", file: "packages/spec/src/index.ts" },
  { pkg: "@ggsvelte/core", entry: ".", file: "packages/core/src/index.ts" },
  { pkg: "@ggsvelte/core", entry: "./dom", file: "packages/core/src/dom/index.ts" },
  { pkg: "@ggsvelte/svelte", entry: ".", file: "packages/svelte/src/lib/index.ts" },
];

export class LifecycleError extends Error {
  constructor(problems: readonly string[]) {
    super(`lifecycle extraction failed:\n  - ${problems.join("\n  - ")}`);
    this.name = "LifecycleError";
  }
}

export interface ExtractedExport {
  name: string;
  kind: "value" | "type";
  lifecycle: LifecycleTag;
}

function isTag(s: string): s is LifecycleTag {
  return (LIFECYCLE_TAGS as readonly string[]).includes(s);
}

/** Parse one brace-list entry ("Name", "A as B", "default as X") + its tag. */
function parseEntry(
  entry: string,
  rawLine: string,
  nameTagRaw: string | undefined,
  stmtTag: LifecycleTag,
  kind: "value" | "type",
  file: string,
): { export: ExtractedExport } | { problem: string } {
  const asMatch = /(?:^|\s)as\s+(\w+)$/.exec(entry);
  const name = asMatch?.[1] ?? entry;
  if (!/^\w+$/.test(name)) {
    return { problem: `${file}: cannot parse export entry "${rawLine.trim()}"` };
  }
  let tag = stmtTag;
  if (nameTagRaw !== undefined) {
    if (!isTag(nameTagRaw)) {
      return { problem: `${file}: unknown lifecycle tag "${nameTagRaw}" on "${name}"` };
    }
    tag = nameTagRaw;
  }
  return { export: { name, kind, lifecycle: tag } };
}

/**
 * Extract exports + lifecycle tags from one index-file source (pure —
 * unit-tested). Only re-export statement forms are allowed in index files;
 * anything else that exports is an error, so nothing can dodge tagging.
 */
export function extractExports(source: string, file: string): ExtractedExport[] {
  const problems: string[] = [];
  const defaultMatch = /\/\/ @lifecycle-default ([a-z-]+)/.exec(source);
  if (defaultMatch === null) {
    throw new LifecycleError([`${file}: missing "// @lifecycle-default <tag>" header marker`]);
  }
  const fileDefault = defaultMatch[1]!;
  if (!isTag(fileDefault)) {
    throw new LifecycleError([`${file}: unknown default lifecycle tag "${fileDefault}"`]);
  }

  const out: ExtractedExport[] = [];
  // Statement matcher: optional preceding one-line JSDoc marker (EXACT form
  // "/** @lifecycle x */" — anything looser can swallow preceding statements
  // through prose comments), then `export [type] { ... } [from "..."];`
  const stmt =
    /(\/\*\* @lifecycle ([a-z-]+) \*\/\s*)?export (type )?\{([^}]*)\}(\s*from\s*"[^"]+")?;/g;
  let covered = 0;
  for (const m of source.matchAll(stmt)) {
    covered += m[0].length;
    const stmtTagRaw = m[2];
    if (stmtTagRaw !== undefined && !isTag(stmtTagRaw)) {
      problems.push(`${file}: unknown statement lifecycle tag "${stmtTagRaw}"`);
      continue;
    }
    const stmtTag: LifecycleTag = stmtTagRaw ?? fileDefault;
    const kind: "value" | "type" = m[3] === undefined ? "value" : "type";
    for (const rawLine of m[4]!.split("\n")) {
      const nameTag = /\/\/ @lifecycle ([a-z-]+)/.exec(rawLine);
      const cleaned = rawLine
        .replace(/\/\/.*$/, "")
        .trim()
        .replace(/,$/, "")
        .trim();
      if (cleaned === "") continue;
      const entries = cleaned
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e !== "");
      if (nameTag !== null && entries.length > 1) {
        problems.push(
          `${file}: a trailing @lifecycle tag on a multi-name line is ambiguous: "${rawLine.trim()}"`,
        );
        continue;
      }
      for (const entry of entries) {
        const parsed = parseEntry(entry, rawLine, nameTag?.[1], stmtTag, kind, file);
        if ("problem" in parsed) problems.push(parsed.problem);
        else out.push(parsed.export);
      }
    }
  }
  // Safety: any export form the statement matcher does not cover (declarations,
  // star re-exports, default exports) must not appear in an index file.
  const stripped = source.replaceAll(stmt, "").replaceAll(/\/\*[^]*?\*\//g, "");
  for (const line of stripped.split("\n")) {
    const t = line.trim();
    if (t.startsWith("//")) continue;
    if (/^export\b/.test(t)) {
      problems.push(`${file}: unsupported export form for lifecycle tagging: "${t}"`);
    }
  }
  if (out.length === 0) problems.push(`${file}: no exports found`);
  const seen = new Map<string, "value" | "type">();
  for (const e of out) {
    const prev = seen.get(e.name);
    if (prev === e.kind) problems.push(`${file}: duplicate export "${e.name}"`);
    seen.set(e.name, e.kind);
  }
  if (problems.length > 0) throw new LifecycleError(problems);
  return out.toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Assemble the lifecycle.json document (deterministic). */
export function buildLifecycleDocument(read: (file: string) => string): Record<string, unknown> {
  const surfaces: Record<string, unknown>[] = [];
  for (const surface of SURFACES) {
    const exports = extractExports(read(surface.file), surface.file);
    surfaces.push({
      package: surface.pkg,
      entry: surface.entry,
      source: surface.file,
      exports: Object.fromEntries(
        exports.map((e) => [e.name, { kind: e.kind, lifecycle: e.lifecycle }]),
      ),
    });
  }
  return {
    $comment:
      "GENERATED by scripts/gen-lifecycle.ts — do not edit. Regenerate with `bun run lifecycle:gen`. Tag meanings: CONTRIBUTING.md (Lifecycle policy).",
    tags: LIFECYCLE_TAGS,
    surfaces,
  };
}

export function lifecycleJSON(read: (file: string) => string): string {
  return JSON.stringify(buildLifecycleDocument(read), null, 2) + "\n";
}

function main(): void {
  const repoRoot = join(import.meta.dir, "..");
  const outPath = join(repoRoot, "lifecycle.json");
  const fresh = lifecycleJSON((file) => readFileSync(join(repoRoot, file), "utf8"));
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
  if (process.argv.includes("--check")) {
    if (current === fresh) {
      console.log("lifecycle.json is current.");
      return;
    }
    console.error(
      current === null
        ? "lifecycle.json is MISSING. Run: bun run lifecycle:gen"
        : "lifecycle.json is STALE (public surface changed). Run: bun run lifecycle:gen",
    );
    process.exit(1);
  }
  if (current === fresh) {
    console.log("lifecycle.json already current.");
    return;
  }
  writeFileSync(outPath, fresh);
  console.log(`Wrote lifecycle.json (${String(fresh.length)} bytes).`);
}

if (import.meta.main) main();
