/**
 * Shared fixtures for the skill-content suites.
 *
 * The file list covers only the skill surface: SKILL.md + references/. The
 * package root also holds README.md (npm front door) and — after the first
 * Version Packages PR — a changesets-generated CHANGELOG.md; holding those to
 * the fence contract would let a routine release note turn main red.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Repo root, computed from this nested test directory (scripts/skill-content/).
 */
export const ROOT = resolve(import.meta.dir, "..", "..");
export const SKILL_DIR = join(ROOT, "packages", "skill");

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

export const FILES = [
  join(SKILL_DIR, "SKILL.md"),
  ...markdownFiles(join(SKILL_DIR, "references")),
].map((path) => ({
  name: relative(SKILL_DIR, path),
  markdown: readFileSync(path, "utf8"),
}));

/**
 * A name counts as documented only when it appears as its own table cell
 * (`| name |`) or leads one (`| name (…` for annotations like aliases) in the
 * expected reference file — prose mentions and substrings do not count.
 */
export function tableCellNames(markdown: string): Set<string> {
  const names = new Set<string>();
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue;
    for (const rawCell of line.split("|")) {
      const cell = rawCell.trim().replaceAll(/^`|`$/g, "");
      if (cell) names.add(cell.split(/[\s(]/, 1)[0]!.replace(/`$/, ""));
    }
  }
  return names;
}
