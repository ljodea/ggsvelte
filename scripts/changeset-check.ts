/**
 * Changeset visibility check — non-blocking changeset-bot equivalent.
 *
 * Changesets only records PRs that add a `.changeset/*.md` file; a PR without
 * one merges silently and never reaches the CHANGELOG or a version bump
 * (release PR #45 shipped ~200 PRs with 4 changelog entries). This script
 * decides whether a PR touches npm-published code without declaring a
 * changeset so the workflow can leave a sticky informational comment.
 *
 * Deliberately NOT a merge gate: internal-only changes are the common case in
 * this repo and forcing empty changesets is worse than an ignorable comment.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type PublishedPackage = {
  /** Repo-relative package dir, e.g. "packages/core". */
  dir: string;
  name: string;
  /** npm `files` entries — the dirs that ship in the tarball. */
  shipped: string[];
};

export type Verdict = "changeset-present" | "not-needed" | "missing";

export type Decision = {
  verdict: Verdict;
  /** Published files the PR touches (empty unless verdict is "missing"). */
  touched: string[];
};

/**
 * Read the npm-published workspace packages from packages/*. Published means
 * no `"private": true`; `shipped` mirrors the npm `files` field (the dirs
 * that actually reach the tarball).
 */
export function discoverPublishedPackages(root: string): PublishedPackage[] {
  const packages: PublishedPackage[] = [];
  for (const entry of readdirSync(join(root, "packages"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(root, "packages", entry.name, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: string;
      private?: boolean;
      files?: string[];
    };
    if (manifest.private === true || typeof manifest.name !== "string") continue;
    packages.push({
      dir: `packages/${entry.name}`,
      name: manifest.name,
      shipped: manifest.files ?? [],
    });
  }
  return packages.toSorted((a, b) => a.dir.localeCompare(b.dir));
}

/** Hidden marker the workflow greps for to find/update its own comment. */
export const COMMENT_MARKER = "<!-- ggsvelte-changeset-check -->";

const LISTING_CAP = 10;

export function renderComment(decision: Decision): string {
  if (decision.verdict === "changeset-present") {
    return `${COMMENT_MARKER}\n✅ **Changeset detected.** This PR's changes will appear in the next Version Packages PR and CHANGELOG.\n`;
  }
  if (decision.verdict === "not-needed") {
    return `${COMMENT_MARKER}\n**No changeset needed.** This PR does not touch npm-published package code.\n`;
  }
  const shown = decision.touched.slice(0, LISTING_CAP).map((f) => `- \`${f}\``);
  const rest = decision.touched.length - LISTING_CAP;
  if (rest > 0) {
    shown.push(`- …and ${rest} more`);
  }
  return [
    COMMENT_MARKER,
    "⚠️ **No changeset found**, but this PR changes npm-published code:",
    "",
    ...shown,
    "",
    "Without a changeset this PR will publish silently: no CHANGELOG entry, no",
    "version-bump influence (see how release PR #45 covered ~200 PRs with 4",
    "entries). If consumers should hear about this change, add one:",
    "",
    "```sh",
    "bun changeset",
    "```",
    "",
    "This check does **not block** merging — internal-only or",
    "not-worth-announcing changes can ignore it.",
    "",
  ].join("\n");
}

function isChangesetFile(path: string): boolean {
  return /^\.changeset\/(?!README\.md$)[^/]+\.md$/.test(path);
}

function isShippedPath(path: string, pkg: PublishedPackage): boolean {
  if (path === `${pkg.dir}/package.json`) return true;
  // Colocated test files live under src/ but are not part of the consumer
  // surface a changelog entry describes.
  if (/\.(test|spec)\.[jt]sx?$/.test(path)) return false;
  return pkg.shipped.some((dir) => path.startsWith(`${pkg.dir}/${dir}/`));
}

export function decideChangesetComment(
  changedFiles: string[],
  packages: PublishedPackage[],
): Decision {
  if (changedFiles.some((path) => isChangesetFile(path))) {
    return { verdict: "changeset-present", touched: [] };
  }
  const touched = changedFiles.filter((path) => packages.some((pkg) => isShippedPath(path, pkg)));
  if (touched.length > 0) {
    return { verdict: "missing", touched };
  }
  return { verdict: "not-needed", touched: [] };
}

async function readStdinPaths(): Promise<string[]> {
  const text = await new Response(Bun.stdin.stream()).text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function runEmitCli(args: string[]): Promise<void> {
  const bodyOutIndex = args.indexOf("--body-out");
  const bodyOut = bodyOutIndex === -1 ? undefined : args[bodyOutIndex + 1];
  if (!args.includes("--stdin") || bodyOut === undefined) {
    throw new Error("usage: changeset-check.ts emit --stdin --body-out <path>");
  }
  const files = await readStdinPaths();
  const decision = decideChangesetComment(files, discoverPublishedPackages(process.cwd()));
  writeFileSync(bodyOut, renderComment(decision));
  const outputs = `verdict=${decision.verdict}\n`;
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (typeof githubOutput === "string" && githubOutput.length > 0) {
    appendFileSync(githubOutput, outputs);
  }
  process.stdout.write(outputs);
}

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== "emit") {
    console.error("usage: changeset-check.ts emit --stdin --body-out <path>");
    process.exit(1);
  }
  await runEmitCli(rest);
}
