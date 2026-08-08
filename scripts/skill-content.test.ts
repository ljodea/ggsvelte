/**
 * Content contract for the published agent skill (packages/skill/, npm:
 * @ggsvelte/skill)..
 *
 * The skill ships as the @ggsvelte/skill npm package and teaches agents the
 * grammar; a stale or broken claim there produces broken charts downstream.
 * Four guards:
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
 * 4. SKILL.md lead-line inventory — the summary prose in "Scales, palettes,
 *    themes" states totals (and for themes, the **full product name list**)
 *    that agents see without opening references/. Format:
 *      `N named schemes — M categorical (…examples…) and K sequential…`
 *      `Themes: T names (`name`, `name`, … plus `grey`/`gray` alias note)`
 *    N = COLOR_SCHEME_NAMES.length, M = CATEGORICAL_SCHEME_NAMES.length,
 *    K = SEQUENTIAL_SCHEME_NAMES.length, T = THEME_NAMES without `test`.
 *    Theme lead line must name every product theme (comprehensive — not a
 *    representative subset). Full looks/shells live in references/themes.md.
 *    Reference section headers `### Categorical schemes (M)` and
 *    `### Sequential schemes (K)` must match the same M/K.
 *
 * The `test` theme is excluded from the theme inventory on purpose: it is
 *    the internal snapshot theme, not a product surface.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  CATEGORICAL_SCHEME_NAMES,
  COLOR_SCHEME_NAMES,
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
import { ggplotOpenAttrs, plotLevelInteractionOffenders } from "./ggplot-open-attrs.ts";
import { codeBlocks } from "./guide-code-contract.ts";

const ROOT = join(import.meta.dir, "..");
const SKILL_DIR = join(ROOT, "packages", "skill");

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

// Only the skill surface: SKILL.md + references/. The package root also
// holds README.md (npm front door) and — after the first Version Packages
// PR — a changesets-generated CHANGELOG.md; holding those to the fence
// contract would let a routine release note turn main red.
const FILES = [join(SKILL_DIR, "SKILL.md"), ...markdownFiles(join(SKILL_DIR, "references"))].map(
  (path) => ({
    name: relative(SKILL_DIR, path),
    markdown: readFileSync(path, "utf8"),
  }),
);

describe("skill fence contract", () => {
  it("finds skill markdown to check", () => {
    expect(FILES.length).toBeGreaterThan(0);
  });

  it("checks only the skill surface (SKILL.md + references/), not package-root docs", () => {
    // A changesets-generated CHANGELOG.md or the npm README carrying an
    // unflagged fence must never fail this suite (Devin P1 on #1425).
    const names = FILES.map((f) => f.name);
    expect(names).toContain("SKILL.md");
    for (const name of names) {
      expect(name === "SKILL.md" || name.startsWith("references/")).toBe(true);
    }
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
 * v0.20 host interaction API: teach <Inspect> and GuideLegend focus/filter,
 * not the deprecated plot-level inspect / legendFocus / legendFilter props.
 * Mark-level inspect={false} remains valid (hit-test opt-out).
 */
describe("skill Svelte fences use v0.20 interaction children", () => {
  for (const file of FILES) {
    it(`${file.name} shows no plot-level inspect / legendFocus / legendFilter`, () => {
      const offenders = codeBlocks(file.markdown)
        .filter((block) => block.language === "svelte")
        .flatMap((block) =>
          ggplotOpenAttrs(block.source).flatMap((attrs) => plotLevelInteractionOffenders(attrs)),
        );
      expect(offenders).toEqual([]);
    });
  }

  it("interactions.md capability table prefers GuideLegend filter, not plot legendFilter", () => {
    const interactions = FILES.find((f) => f.name === "references/interactions.md");
    expect(interactions).toBeDefined();
    // Table row for filter should name GuideLegend, not GGPlot.
    expect(interactions!.markdown).toMatch(/`filter`\s*\|\s*`boolean[^`]*` on `<GuideLegend>`/);
    // Middle cell may contain markdown-escaped pipes (`\|`); do not use [^|].
    expect(interactions!.markdown).not.toMatch(/\| `legendFilter`\s*\|[^\n]*on `<GGPlot>`/);
  });
});

/**
 * v0.21 row identity: default id-column / row-index; prefer identity on
 * Inspect / Select / createPlotInteraction. Plot-level key is deprecated.
 * SKILL.md must not teach key as a first-class prop or as the required
 * identity surface (#1286 / #1254 / #1257).
 */
describe("skill teaches v0.21 row identity, not plot-level key", () => {
  const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
  const interactions = FILES.find((f) => f.name === "references/interactions.md");

  it("SKILL.md nowhere recommends plot-level key without a deprecation note", () => {
    // Bare first-class listing from pre-0.21 skill (the #1286 bug).
    expect(skill).not.toMatch(/`layers`, `key`, `width`/);
    expect(skill).not.toMatch(/Always give a stable `key`/);
    // Every remaining backtick-key mention in SKILL.md is the deprecation note.
    const keyMentions = [...skill.matchAll(/`key`/g)];
    expect(keyMentions.length).toBeGreaterThan(0);
    for (const match of keyMentions) {
      const index = match.index ?? 0;
      const start = Math.max(0, index - 40);
      const end = Math.min(skill.length, index + match[0].length + 40);
      expect(skill.slice(start, end).toLowerCase()).toMatch(/deprecat/);
    }
  });

  it("SKILL.md Interactions section teaches identity defaults", () => {
    expect(skill).toMatch(/Row identity for selection/);
    expect(skill).toMatch(/`id` column when present/);
    expect(skill).toMatch(/`identity` on `<Inspect>`/);
    expect(skill).toMatch(/Plot-level `key` is deprecated/);
  });

  it("interactions.md marks plot-level key deprecated and prefers identity", () => {
    expect(interactions).toBeDefined();
    expect(interactions!.markdown).toMatch(/Plot-level `key` is deprecated/);
    expect(interactions!.markdown).toMatch(/\| `key`\s*\|[^\n]*\*\*deprecated\*\* since 0\.21/);
    expect(interactions!.markdown).toMatch(/Prefer this over plot-level `key`/);
  });
});

/**
 * #1200 postmortem: an agent read PortableSpec.layers[] (marks only) plus a
 * false "are not layers" comment and filed issues claiming Scale/Theme/Guide/
 * Labs/Coord/Facet/Legend were "non-layer grammar components." They are Layer
 * kinds in Svelte. Keep the skill and quickstart from reintroducing that claim.
 */
describe("layer ontology (grammar families are layers)", () => {
  it("SKILL.md states Svelte Layer union and PortableSpec dual vocabulary", () => {
    const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
    expect(skill).toMatch(/Everything that composes a plot is a layer/i);
    expect(skill).toMatch(/layers\[\] = MARKS ONLY/);
    expect(skill).toMatch(/non-layer grammar component/);
    expect(skill).toMatch(/is wrong/);
    // Affirmative inverted claim must not reappear.
    expect(skill).not.toMatch(/that are not themselves/);
    expect(skill).not.toMatch(/because they are not layers/i);
  });

  it("composition-surfaces.md calls grammar surfaces layers", () => {
    const prose = readFileSync(join(SKILL_DIR, "references", "composition-surfaces.md"), "utf8");
    expect(prose).toMatch(/grammar layer/i);
    expect(prose).not.toMatch(/because they are not layers/i);
  });

  it("quickstart holds grammar children as plot layers, not non-layers", () => {
    const steps = readFileSync(join(ROOT, "scripts", "quickstart", "steps.ts"), "utf8");
    expect(steps).toMatch(/are\*\* plot layers|\*\*are\*\* plot layers|are plot layers/);
    expect(steps).not.toMatch(/because they are not layers/);
  });
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
      file: "themes.md",
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

/**
 * Product themes agents may name — every THEME_NAMES entry except the internal
 * snapshot theme `test`. Includes `grey`/`gray` aliases of `ggplot2`.
 */
const PRODUCT_THEME_NAMES = THEME_NAMES.filter((name) => name !== "test");

/**
 * Lead-line inventory in SKILL.md. Table rows in references/ are already
 * locked by the inventory suite above; this guards the counts (and the
 * comprehensive theme name list) agents see when they only load SKILL.md
 * (#1210).
 */
describe("SKILL.md lead-line scheme/theme inventory matches registries", () => {
  const skillMd = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
  const scalesRef = readFileSync(join(SKILL_DIR, "references", "scales-and-palettes.md"), "utf8");
  const themesRef = readFileSync(join(SKILL_DIR, "references", "themes.md"), "utf8");

  it("states named scheme totals that match COLOR/CATEGORICAL/SEQUENTIAL registries", () => {
    const match = skillMd.match(
      /(\d+) named schemes — (\d+) categorical[\s\S]*?and (\d+) sequential/,
    );
    expect(match).not.toBeNull();
    const [, total, categorical, sequential] = match!;
    expect({
      total: Number(total),
      categorical: Number(categorical),
      sequential: Number(sequential),
    }).toEqual({
      total: COLOR_SCHEME_NAMES.length,
      categorical: CATEGORICAL_SCHEME_NAMES.length,
      sequential: SEQUENTIAL_SCHEME_NAMES.length,
    });
  });

  it("states a theme total that matches product THEME_NAMES (excludes test)", () => {
    const match = skillMd.match(/Themes:\s*(\d+) names/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(PRODUCT_THEME_NAMES.length);
  });

  it("reference palette section headers carry the same categorical/sequential totals", () => {
    const cat = scalesRef.match(/### Categorical schemes \((\d+)\)/);
    const seq = scalesRef.match(/### Sequential schemes \((\d+)\)/);
    expect(cat).not.toBeNull();
    expect(seq).not.toBeNull();
    expect(Number(cat![1])).toBe(CATEGORICAL_SCHEME_NAMES.length);
    expect(Number(seq![1])).toBe(SEQUENTIAL_SCHEME_NAMES.length);
  });

  it("themes.md product-theme heading carries the product theme total", () => {
    const match = themesRef.match(/## Product themes \((\d+)\)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(PRODUCT_THEME_NAMES.length);
  });

  it("lead-line example scheme names are real registry members", () => {
    // Pull the two parenthetical example lists from the scheme lead line.
    const match = skillMd.match(
      /(\d+) named schemes — (\d+) categorical \(([^)]*)\)[\s\S]*?and (\d+) sequential[^(]*\(([^)]*)\)/,
    );
    expect(match).not.toBeNull();
    const known = new Set<string>(COLOR_SCHEME_NAMES);
    const examples = [...`${match![3]} ${match![5]}`.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
    expect(examples.length).toBeGreaterThan(0);
    const unknown = examples.filter((name) => !known.has(name));
    expect(unknown).toEqual([]);
  });

  it("SKILL.md theme lead lists every product theme name (comprehensive)", () => {
    // Themes: T names (`a`, `b`, … plus `grey`/`gray` aliasing `ggplot2`)
    // Allow multi-line parentheticals: stop at the first `) as` that closes
    // the lead (the alias note uses `grey`/`gray` without a bare `)`).
    const match = skillMd.match(/Themes:\s*\d+ names \(([\s\S]*?)\) as/);
    expect(match).not.toBeNull();
    const listed = new Set([...match![1]!.matchAll(/`([^`]+)`/g)].map((m) => m[1]!));
    const missing = PRODUCT_THEME_NAMES.filter((name) => !listed.has(name));
    expect(missing).toEqual([]);
  });
});

/**
 * #1530: Inspect mode selection + multi-layer hit hygiene.
 *
 * API surface (mode options, inspect={false}) is already documented. Agents
 * still ship wrong modes (violin with mode="x", Minard with hit-testable
 * rivers) because the skill never said "do not do that." CLI SVG render
 * cannot catch host Inspect mode — only the skill + a real hover check can.
 * These contracts lock the design rules so skill content stays the gate.
 */
describe("skill teaches inspect mode selection and hit hygiene (#1530)", () => {
  const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
  const interactions = FILES.find((f) => f.name === "references/interactions.md");

  it("interactions.md has a Choosing inspect mode section", () => {
    expect(interactions).toBeDefined();
    expect(interactions!.markdown).toMatch(/## Choosing inspect mode/i);
  });

  it("Choosing inspect mode prefers auto when product auto matches geometry", () => {
    const section = interactions!.markdown.match(/## Choosing inspect mode[\s\S]*?(?=\n## )/)?.[0];
    expect(section).toBeDefined();
    expect(section!).toMatch(/Prefer `mode="auto"` when library auto matches/);
    // Axis-group modes only when continuous shared-x (or y) series justify them.
    expect(section!).toMatch(/continuous shared-x|time series|multi-series/i);
  });

  it("pins exact on violin/boxplot/discrete intervals; forbids freescrolling axis guides", () => {
    const section = interactions!.markdown.match(/## Choosing inspect mode[\s\S]*?(?=\n## )/)?.[0];
    expect(section).toBeDefined();
    expect(section!).toMatch(/Anti-patterns/);
    // Discrete distribution/interval geoms: exact focus; never freescrolling x/y/xy (#1528).
    expect(section!).toMatch(/Pin `mode="exact"`/);
    expect(section!).toMatch(/Violin with `mode="x"`/);
    expect(section!).toMatch(/Boxplot with `mode="x"`/);
    expect(section!).toMatch(/errorbar/);
    expect(section!).toMatch(/pointrange/);
    expect(section!).toMatch(/linerange/);
    expect(section!).toMatch(/#1528/);
    // Auto now maps those geoms to exact — skill may recommend exact or leave auto.
    expect(section!).toMatch(/leave `auto`|auto → exact/);
    // Must not claim product auto still freescrolls those marks.
    expect(section!).not.toMatch(/auto still → `x`|auto still maps them to freescrolling/);
  });

  it("documents multi-layer hit hygiene with Minard-class furniture opt-out", () => {
    const section = interactions!.markdown.match(
      /## Multi-layer hit hygiene[\s\S]*?(?=\n## )/,
    )?.[0];
    expect(section).toBeDefined();
    expect(section!).toMatch(/inspect=\{false\}/);
    expect(section!).toMatch(/Minard/);
    expect(section!).toMatch(/path\/trajectory/);
    expect(section!).toMatch(/one primary[\s*]+story family/);
    expect(section!).toMatch(/troop path/);
    // Independent panels — do not invent ring anchors for false linked selection.
    expect(section!).not.toMatch(/ring-anchor|ring anchors/);
    expect(section!).toMatch(/independent|separate panel|shared longitude/i);
    expect(section!).toMatch(/summary/i);
  });

  it("notes that CLI SVG render does not validate host inspect behaviour", () => {
    const section = interactions!.markdown.match(
      /## CLI cannot catch host inspect behaviour[\s\S]*?(?=\n## )/,
    )?.[0];
    expect(section).toBeDefined();
    expect(section!).toMatch(/ggsvelte-render/);
    expect(section!).toMatch(
      /does \*\*not\*\* validate host Inspect mode|does not validate host Inspect mode/i,
    );
  });

  it("requires a real hover/pin check after changing interaction (not SVG-only)", () => {
    const section = interactions!.markdown.match(
      /## CLI cannot catch host inspect behaviour[\s\S]*?(?=\n## )/,
    )?.[0];
    expect(section).toBeDefined();
    expect(section!).toMatch(/real hover and pin/i);
    expect(section!).toMatch(/docs site|playground|browser/i);
  });

  it("SKILL.md Interactions section points at mode selection and hit hygiene rules", () => {
    // One short pointer, not a second full copy of the reference.
    const interactionsSection = skill.match(/## Interactions[\s\S]*?(?=\n## )/)?.[0] ?? "";
    expect(interactionsSection.length).toBeGreaterThan(100);
    expect(interactionsSection).toMatch(/references\/interactions\.md/);
    expect(interactionsSection).toMatch(/Choosing inspect\s+mode/);
    expect(interactionsSection).toMatch(/pin `mode="exact"` \(or leave auto\) on violin/i);
    expect(interactionsSection).toMatch(/inspect=\{false\}/);
    expect(interactionsSection).toMatch(/before enabling Inspect/);
  });

  it("records keep-single skill (no split) decision for #1530", () => {
    // Default remains one @ggsvelte/skill until progressive disclosure fails.
    // Recorded in interactions.md so the decision travels with the package.
    const section = interactions!.markdown.match(
      /## CLI cannot catch host inspect behaviour[\s\S]*?(?=\n## )/,
    )?.[0];
    expect(section).toBeDefined();
    expect(section!).toMatch(/Skill packaging decision \(#1530\)/);
    expect(section!).toMatch(/single skill/);
    expect(section!).toMatch(/Do not split/);
  });
});
