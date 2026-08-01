/**
 * Publish every package.json version under packages/ that is not yet on npm.
 *
 * Decoupled from changesets/action on purpose. The action is either/or: any
 * leftover `.changeset/*.md` makes it open/update the Version Packages PR and
 * skip publish entirely (job still green). This script always ships whatever
 * is already version-bumped on main, recovering the concurrent-merge race.
 *
 * GitHub releases / tags are intentionally NOT created here. That work lives
 * in a later workflow step that holds GITHUB_TOKEN and runs only `gh`/`git`,
 * so the write credential never enters a process that executes repository
 * code or node_modules (see stage-github-releases.ts + release.yml).
 *
 * Idempotent: if everything is already on npm, exits 0 with no work.
 *
 * Usage: bun scripts/publish-unpublished.ts
 * Requires: built packages (dist/), npm auth (OIDC trusted publishing or token).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
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
  if (stdout.length > 0) process.stdout.write(stdout);
  if (stderr.length > 0) process.stderr.write(stderr);
  if (status !== 0 && opts.allowFail !== true) {
    throw new Error(`${command} ${args.join(" ")} exited ${String(status)}`);
  }
  return { status, stdout, stderr };
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

  console.log(
    `publish-unpublished: published ${String(tags.length)} tag(s); GitHub releases staged next`,
  );
  for (const tag of tags) {
    console.log(`  - ${tag}`);
  }
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
