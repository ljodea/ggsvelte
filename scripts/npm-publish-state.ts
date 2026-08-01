/**
 * Helpers for "is this package.json version on npm?" — used by the release
 * race-recovery publish step and the loud assert that forbids silent skips.
 *
 * Background: changesets/action is either/or. If any `.changeset/*.md` remains
 * on main it only opens/updates the Version Packages PR and never publishes.
 * Concurrent merges (Version Packages + a feature PR with a new changeset)
 * leave version bumps on main, skip npm publish, and still exit green. These
 * helpers make that drift detectable and recoverable.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageVersion = {
  /** Repo-relative package dir, e.g. "packages/core". */
  dir: string;
  name: string;
  version: string;
};

/**
 * Read name+version for every non-private package under packages/*.
 * Sorted by dir for stable logs and tests.
 */
export function readPublishedPackageVersions(root: string): PackageVersion[] {
  const packagesDir = join(root, "packages");
  if (!existsSync(packagesDir)) return [];
  const out: PackageVersion[] = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(packagesDir, entry.name, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: string;
      version?: string;
      private?: boolean;
    };
    if (manifest.private === true) continue;
    if (typeof manifest.name !== "string" || typeof manifest.version !== "string") continue;
    out.push({
      dir: `packages/${entry.name}`,
      name: manifest.name,
      version: manifest.version,
    });
  }
  return out.toSorted((a, b) => a.dir.localeCompare(b.dir));
}

/** Registry URL for an exact package version (npm packument version endpoint). */
export function npmVersionUrl(
  name: string,
  version: string,
  registry = "https://registry.npmjs.org",
): string {
  // Scoped packages: @scope/name → @scope%2Fname on the registry path.
  const encoded = name.startsWith("@") ? name.replace("/", "%2F") : name;
  return `${registry.replace(/\/$/, "")}/${encoded}/${version}`;
}

/**
 * True when the registry has this exact version.
 * 404 → false; other non-OK responses throw (auth/network must not look like
 * "not published" and green the assert).
 */
export async function npmVersionExists(
  name: string,
  version: string,
  opts: {
    fetchImpl?: typeof fetch;
    registry?: string;
  } = {},
): Promise<boolean> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = npmVersionUrl(name, version, opts.registry);
  const res = await fetchImpl(url, {
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    throw new Error(
      `npm registry ${res.status} for ${name}@${version} (${url}): refuse to treat as unpublished`,
    );
  }
  return true;
}

/** Packages whose local version is not in the set of "name@version" strings known on npm. */
export function filterUnpublished(
  local: readonly PackageVersion[],
  publishedKeys: ReadonlySet<string>,
): PackageVersion[] {
  return local.filter((pkg) => !publishedKeys.has(`${pkg.name}@${pkg.version}`));
}

/** Parse `changeset publish` stdout for "New tag: <name>@<version>" lines. */
export function parseNewTags(publishStdout: string): string[] {
  const tags: string[] = [];
  // changesets logs either "New tag: @scope/name@1.2.3" or "New tag: name@1.2.3"
  const re = /New tag:\s+(\S+)/g;
  for (const match of publishStdout.matchAll(re)) {
    const tag = match[1];
    if (tag !== undefined && tag.length > 0) tags.push(tag);
  }
  return tags;
}

/**
 * Extract the body of a package CHANGELOG section for `## <version>`.
 * Header match is line-anchored and exact so `## 0.24.1` does not match
 * `## 0.24.10` (changelogs are newest-first).
 * Returns null when the section is missing (caller decides how loud to be).
 */
export function changelogSectionForVersion(changelog: string, version: string): string | null {
  const escaped = version.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerRe = new RegExp(`^## ${escaped}\\s*$`, "m");
  const headerMatch = headerRe.exec(changelog);
  if (headerMatch === null || headerMatch.index === undefined) return null;
  const start = headerMatch.index + headerMatch[0].length;
  // Skip the rest of the header line if any trailing whitespace remained.
  let bodyStart = start;
  if (changelog[bodyStart] === "\n") bodyStart += 1;
  const rest = changelog.slice(bodyStart);
  const next = rest.search(/^## /m);
  const body = (next === -1 ? rest : rest.slice(0, next)).trim();
  return body;
}

/** Human-readable failure for the assert gate. */
export function formatUnpublishedFailure(unpublished: readonly PackageVersion[]): string {
  const lines = unpublished.map((p) => `  - ${p.name}@${p.version} (${p.dir}/package.json)`);
  return [
    "ERROR: package.json versions on this commit are not on npm.",
    "This is the silent-failure mode of changesets/action: when a Version",
    "Packages PR merges while another PR leaves a new .changeset/*.md on main,",
    "the action takes the 'update Version Packages PR' path and never publishes.",
    "Unpublished packages:",
    ...lines,
    "Recovery: re-run the Release workflow (or merge any PR to main) so the",
    "publish-unpublished step ships them; do not ignore a red assert.",
  ].join("\n");
}
