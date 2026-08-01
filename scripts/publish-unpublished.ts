/**
 * Publish every package.json version under packages/ that is not yet on npm.
 *
 * Decoupled from changesets/action on purpose. The action is either/or: any
 * leftover `.changeset/*.md` makes it open/update the Version Packages PR and
 * skip publish entirely (job still green). This script always ships whatever
 * is already version-bumped on main, recovering the concurrent-merge race,
 * then creates GitHub releases (and remote tags) for the new versions.
 *
 * Idempotent: if everything is already on npm, exits 0 with no work.
 *
 * Usage: bun scripts/publish-unpublished.ts
 * Requires: built packages (dist/), npm auth (OIDC trusted publishing or token),
 *           GITHUB_TOKEN so `gh release create` can mint tags + releases.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  changelogSectionForVersion,
  filterUnpublished,
  npmVersionExists,
  parseNewTags,
  readPublishedPackageVersions,
} from "./npm-publish-state.ts";

function run(
  command: string,
  args: string[],
  opts: { allowFail?: boolean } = {},
): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
    cwd: process.cwd(),
  });
  const status = res.status ?? 1;
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (status !== 0 && !opts.allowFail) {
    throw new Error(`${command} ${args.join(" ")} exited ${String(status)}`);
  }
  return { status, stdout, stderr };
}

function gitHeadSha(): string {
  const res = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (res.status !== 0) throw new Error("git rev-parse HEAD failed");
  return (res.stdout ?? "").trim();
}

/**
 * Create the remote git tag + GitHub release via `gh` (uses GITHUB_TOKEN from
 * the env). Avoids embedding a basic-auth git remote URL in source — pre-push
 * redaction blocks those patterns, and checkout uses persist-credentials: false.
 * If the release already exists (retry), treat as success.
 */
function createGithubRelease(tag: string, body: string, target: string): void {
  const res = spawnSync(
    "gh",
    ["release", "create", tag, "--title", tag, "--notes", body, "--target", target],
    { encoding: "utf8", env: process.env },
  );
  if (res.status === 0) {
    if (res.stdout) process.stdout.write(res.stdout);
    return;
  }
  const err = `${res.stderr ?? ""}${res.stdout ?? ""}`;
  if (/already exists/i.test(err)) {
    console.log(`GitHub release ${tag} already exists — ok`);
    return;
  }
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  throw new Error(`gh release create ${tag} exited ${String(res.status ?? 1)}`);
}

function releaseNotesForTag(root: string, tag: string): string {
  // tag shape: @ggsvelte/core@0.24.1 → name=@ggsvelte/core, version=0.24.1
  const at = tag.lastIndexOf("@");
  if (at <= 0) {
    return `Release ${tag}`;
  }
  const name = tag.slice(0, at);
  const version = tag.slice(at + 1);
  const local = readPublishedPackageVersions(root);
  const pkg = local.find((p) => p.name === name);
  if (!pkg) return `Release ${tag}`;
  const changelogPath = join(root, pkg.dir, "CHANGELOG.md");
  if (!existsSync(changelogPath)) return `Release ${tag}`;
  const section = changelogSectionForVersion(readFileSync(changelogPath, "utf8"), version);
  if (section === null || section.length === 0) return `Release ${tag}`;
  return section;
}

async function main(): Promise<number> {
  const root = process.cwd();
  const local = readPublishedPackageVersions(root);
  if (local.length === 0) {
    console.error("publish-unpublished: no published packages under packages/");
    return 1;
  }

  const publishedKeys = new Set<string>();
  for (const pkg of local) {
    if (await npmVersionExists(pkg.name, pkg.version)) {
      publishedKeys.add(`${pkg.name}@${pkg.version}`);
    }
  }
  const unpublished = filterUnpublished(local, publishedKeys);
  if (unpublished.length === 0) {
    console.log("publish-unpublished: nothing to do — all package versions are on npm");
    return 0;
  }

  console.log(
    `publish-unpublished: shipping ${String(unpublished.length)} unpublished version(s):`,
  );
  for (const pkg of unpublished) {
    console.log(`  - ${pkg.name}@${pkg.version}`);
  }

  // Lockfile-installed binary — repo policy bans network bunx.
  const changesetBin = join(root, "node_modules/.bin/changeset");
  if (!existsSync(changesetBin)) {
    console.error("publish-unpublished: node_modules/.bin/changeset missing; run bun install");
    return 1;
  }

  const publish = run("bun", [changesetBin, "publish"], { allowFail: true });
  if (publish.status !== 0) {
    console.error(`publish-unpublished: changeset publish exited ${String(publish.status)}`);
    return publish.status;
  }

  const tags = parseNewTags(publish.stdout);
  if (tags.length === 0) {
    // Registry can race (another runner published between our check and publish).
    // Re-check; if still missing, fail loud.
    const stillMissing: string[] = [];
    for (const pkg of unpublished) {
      if (!(await npmVersionExists(pkg.name, pkg.version))) {
        stillMissing.push(`${pkg.name}@${pkg.version}`);
      }
    }
    if (stillMissing.length > 0) {
      console.error(
        `publish-unpublished: publish produced no "New tag:" lines and still missing:\n  - ${stillMissing.join("\n  - ")}`,
      );
      return 1;
    }
    console.log(
      "publish-unpublished: versions appeared on npm without new tags (concurrent publish?)",
    );
    return 0;
  }

  if (!process.env["GITHUB_TOKEN"]) {
    console.error(
      "publish-unpublished: GITHUB_TOKEN is required so gh can create tags and releases",
    );
    return 1;
  }

  const head = gitHeadSha();
  for (const tag of tags) {
    const notes = releaseNotesForTag(root, tag);
    console.log(`creating GitHub release + remote tag ${tag}`);
    createGithubRelease(tag, notes, head);
  }

  console.log(`publish-unpublished: published and released ${String(tags.length)} tag(s)`);
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
