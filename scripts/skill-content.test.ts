/**
 * Content contract for the shipped agent skill (skills/ggsvelte/).
 *
 * The skill ships inside the ggsvelte npm package and teaches agents the
 * grammar; a stale or broken claim there produces broken charts downstream.
 * Three guards:
 *
 * 1. Fence contract — every code fence carries exactly one of
 *    `complete`/`fragment`, and every `json complete` fence must normalize
 *    and validate the way examples do (examples/define.ts).
 * 2. Deprecated grammar props — no Svelte fence (complete or fragment) shows
 *    the seven props deprecated in 0.11.0. Same textual match as
 *    repo-child-layers.test.ts uses for guide fences.
 * 3. Inventory completeness — the reference tables must have a structured row
 *    for every geom, stat, position, theme, and color scheme the spec knows.
 *    Adding one upstream turns the skill red until it is documented; this is
 *    the pre-changesets lock-step guard.
 *
 * The `test` theme is excluded from the theme inventory on purpose: it is
 *    the internal snapshot theme, not a product surface.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  CATEGORICAL_SCHEME_NAMES,
  KNOWN_GEOMS,
  KNOWN_POSITIONS,
  KNOWN_STATS,
  normalize,
  SEQUENTIAL_SCHEME_NAMES,
  THEME_NAMES,
  validate,
} from "@ggsvelte/spec";
import type { SpecInput } from "@ggsvelte/spec";
import { deprecatedGrammarPropPattern } from "../packages/svelte/src/lib/layers/grammar-families.ts";
import { codeBlocks } from "./guide-code-contract.ts";

const ROOT = join(import.meta.dir, "..");
const SKILL_DIR = join(ROOT, "skills", "ggsvelte");

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

const FILES = markdownFiles(SKILL_DIR).map((path) => ({
  name: relative(SKILL_DIR, path),
  markdown: readFileSync(path, "utf8"),
}));

describe("skill fence contract", () => {
  it("finds skill markdown to check", () => {
    expect(FILES.length).toBeGreaterThan(0);
  });

  for (const file of FILES) {
    it(`${file.name}: every fence is flagged complete or fragment`, () => {
      const unflagged = codeBlocks(file.markdown)
        .filter((block) => block.classification === undefined)
        .map((block) => block.language || "(none)");
      expect(unflagged).toEqual([]);
    });

    it(`${file.name}: every complete JSON fence normalizes and validates`, () => {
      for (const block of codeBlocks(file.markdown)) {
        if (block.language !== "json" || block.classification !== "complete") continue;
        const spec = normalize(JSON.parse(block.source) as SpecInput);
        // Tier 2 ({}): skill specs carry inline data, so data-aware checks
        // run too — the same bar examples/define.ts sets.
        const result = validate(spec, {});
        expect({ snippet: block.source, errors: result.ok ? [] : result.errors }).toEqual({
          snippet: block.source,
          errors: [],
        });
      }
    });
  }
});

describe("skill Svelte fences use child layers, not deprecated grammar props", () => {
  const pattern = deprecatedGrammarPropPattern();

  for (const file of FILES) {
    it(`${file.name} shows no deprecated grammar prop`, () => {
      const offenders = codeBlocks(file.markdown)
        .filter((block) => block.language === "svelte")
        .flatMap((block) => [...block.source.matchAll(pattern)].map((m) => m[1]!));
      expect(offenders).toEqual([]);
    });
  }
});

/**
 * A name counts as documented only when it appears as its own table cell
 * (`| name |`) or leads one (`| name (…` for annotations like aliases) in the
 * expected reference file — prose mentions and substrings do not count.
 */
function tableCellNames(markdown: string): Set<string> {
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

describe("reference inventories are complete", () => {
  const referenceFile = (name: string): string =>
    readFileSync(join(SKILL_DIR, "references", name), "utf8");

  const inventories: readonly {
    file: string;
    label: string;
    names: readonly string[];
  }[] = [
    { file: "geoms-and-stats.md", label: "geoms", names: KNOWN_GEOMS },
    { file: "geoms-and-stats.md", label: "stats", names: KNOWN_STATS },
    { file: "geoms-and-stats.md", label: "positions", names: KNOWN_POSITIONS },
    {
      file: "composition-surfaces.md",
      label: "themes",
      // `test` is the internal snapshot theme — deliberately undocumented.
      names: THEME_NAMES.filter((name) => name !== "test"),
    },
    {
      file: "scales-and-palettes.md",
      label: "categorical schemes",
      names: CATEGORICAL_SCHEME_NAMES,
    },
    {
      file: "scales-and-palettes.md",
      label: "sequential schemes",
      names: SEQUENTIAL_SCHEME_NAMES,
    },
  ];

  for (const inventory of inventories) {
    it(`references/${inventory.file} documents every ${inventory.label}`, () => {
      const cells = tableCellNames(referenceFile(inventory.file));
      const missing = inventory.names.filter((name) => !cells.has(name));
      expect(missing).toEqual([]);
    });
  }
});
