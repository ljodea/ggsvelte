/**
 * skills/ggsvelte/SKILL.md is the source; the copy shipped inside the
 * ggsvelte npm package (packages/svelte/skills/ggsvelte/SKILL.md, listed in
 * its "files") must stay byte-identical. Re-copy when editing:
 *   cp skills/ggsvelte/SKILL.md packages/svelte/skills/ggsvelte/SKILL.md
 */
import { expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

it("packaged SKILL.md matches the repo source", () => {
  const root = join(import.meta.dir, "..");
  const source = readFileSync(join(root, "skills", "ggsvelte", "SKILL.md"), "utf8");
  const shipped = readFileSync(
    join(root, "packages", "svelte", "skills", "ggsvelte", "SKILL.md"),
    "utf8",
  );
  expect(shipped).toBe(source);
});
