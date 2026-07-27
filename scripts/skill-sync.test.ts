/**
 * skills/ggsvelte/ is the source tree; the copy shipped inside the ggsvelte
 * npm package (packages/svelte/skills/ggsvelte/, listed in its "files") must
 * stay byte-identical file for file — SKILL.md and everything under
 * references/. Re-sync when editing (rsync, because cp -R never deletes
 * files removed from the source):
 *   rsync -a --delete skills/ggsvelte/ packages/svelte/skills/ggsvelte/
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SOURCE = join(ROOT, "skills", "ggsvelte");
const SHIPPED = join(ROOT, "packages", "svelte", "skills", "ggsvelte");

function walk(dir: string, base: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, base);
    return [relative(base, path)];
  });
}

describe("packaged skill tree matches the repo source", () => {
  const sourceFiles = walk(SOURCE, SOURCE).toSorted();
  const shippedFiles = walk(SHIPPED, SHIPPED).toSorted();

  it("has files to compare", () => {
    // An empty walk would make every assertion below vacuously pass.
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("ships exactly the source file set (no strays, no missing files)", () => {
    expect(shippedFiles).toEqual(sourceFiles);
  });

  for (const file of sourceFiles) {
    it(`${file} is byte-identical`, () => {
      const source = readFileSync(join(SOURCE, file), "utf8");
      const shipped = readFileSync(join(SHIPPED, file), "utf8");
      expect(shipped).toBe(source);
    });
  }
});
