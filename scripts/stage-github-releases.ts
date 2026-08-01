/**
 * Stage GitHub release notes for every packages/* version already on npm.
 *
 * Runs WITHOUT GITHUB_TOKEN. Writes a staging directory that a later
 * script-free workflow step (`gh`/`git` only) consumes to create tags and
 * GitHub releases. Staging every version that is on npm (not only tags from
 * this run's publish) recovers the case where publish succeeded but tagging
 * failed — a re-run re-stages and the create step is idempotent.
 *
 * Staging layout (RELEASE_STAGING_DIR):
 *   tags.txt     one tag per line, in order
 *   notes/0.md   notes for tags.txt line 0
 *   notes/1.md   …
 *
 * Usage: RELEASE_STAGING_DIR=/tmp/stage bun scripts/stage-github-releases.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  changelogSectionForVersion,
  npmVersionExists,
  planGithubReleaseStaging,
  readPublishedPackageVersions,
  type PackageVersion,
} from "./npm-publish-state.ts";

function notesForPackage(root: string, pkg: PackageVersion): string {
  const tag = `${pkg.name}@${pkg.version}`;
  const changelogPath = join(root, pkg.dir, "CHANGELOG.md");
  if (!existsSync(changelogPath)) return `Release ${tag}`;
  const section = changelogSectionForVersion(readFileSync(changelogPath, "utf8"), pkg.version);
  if (section === null || section.length === 0) return `Release ${tag}`;
  return section;
}

async function main(): Promise<number> {
  const staging = process.env["RELEASE_STAGING_DIR"];
  if (staging === undefined || staging.length === 0) {
    console.error("stage-github-releases: RELEASE_STAGING_DIR is required");
    return 1;
  }

  const root = process.cwd();
  const local = readPublishedPackageVersions(root);
  if (local.length === 0) {
    console.error("stage-github-releases: no published packages under packages/");
    return 1;
  }

  const onNpmKeys = new Set<string>();
  for (const pkg of local) {
    if (await npmVersionExists(pkg.name, pkg.version)) {
      onNpmKeys.add(`${pkg.name}@${pkg.version}`);
    }
  }

  const entries = planGithubReleaseStaging(local, onNpmKeys, (pkg) => notesForPackage(root, pkg));

  mkdirSync(join(staging, "notes"), { recursive: true });
  const tagLines: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry === undefined) continue;
    writeFileSync(join(staging, "notes", `${String(i)}.md`), entry.notes, "utf8");
    tagLines.push(entry.tag);
    console.log(`staged ${entry.tag}`);
  }
  writeFileSync(
    join(staging, "tags.txt"),
    tagLines.length === 0 ? "" : `${tagLines.join("\n")}\n`,
    "utf8",
  );

  console.log(
    `stage-github-releases: staged ${String(tagLines.length)} release(s) under ${staging}`,
  );
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
