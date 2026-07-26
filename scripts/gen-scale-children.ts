/**
 * gen-scale-children — generates declaration-only <Scale*> shells for every
 * camelCase scale helper in SCALE_CAPABILITIES (#659 slice 4).
 *
 * Manifest-driven: `optionsType` is declared per helper (capabilities.ts
 * carries no type info). Wrong optionsTypes re-open props the helper
 * deliberately removed (e.g. scaleXReverse must emit the Omit expression).
 *
 * Usage:
 *   bun scripts/gen-scale-children.ts           # (re)write shells + index region
 *   bun scripts/gen-scale-children.ts --check   # exit 1 on drift without writing
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { SCALE_CAPABILITIES } from "@ggsvelte/spec";

import { defineArtifact, defineArtifactGroup } from "./artifact.ts";

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export interface ShellSpec {
  /** PascalCase component name, e.g. "ScaleXContinuous". */
  component: string;
  /** camelCase helper, e.g. "scaleXContinuous". */
  helper: string;
  /** Must match a SCALE_CAPABILITIES family. */
  family: string;
  /** Full type expression emitted into the shell's `$props()` annotation. */
  optionsType: string;
  /** Named type imports needed from @ggsvelte/spec (verbatimModuleSyntax-safe). */
  typeImports: string[];
  /** Index-only re-exports (e.g. ScaleColourContinuous → ScaleColorContinuous.svelte). */
  aliases?: string[];
}

function shell(
  helper: string,
  family: string,
  optionsType: string,
  typeImports: string[],
  aliases?: string[],
): ShellSpec {
  const component = "S" + helper.slice(1);
  return {
    component,
    helper,
    family,
    optionsType,
    typeImports,
    ...(aliases === undefined ? {} : { aliases }),
  };
}

/** Colour aliases point at the Color component file (no ScaleColour*.svelte). */
function colourAliases(stem: string): string[] {
  return [`ScaleColour${stem}`];
}

/**
 * Complete shell ledger. Cardinality (asserted in tests):
 *   position-continuous  8
 *   position-binned      2
 *   position-temporal    4
 *   position-discrete    2
 *   color-fill          18
 *   numeric-style       21
 *   finite-style         8
 *   ----------------------
 *   63 component files + 9 Colour aliases
 */
export const SHELL_MANIFEST: readonly ShellSpec[] = [
  // --- position-continuous (8) ---------------------------------------------
  shell("scaleXContinuous", "position-continuous", "ContinuousPositionScaleOptions", [
    "ContinuousPositionScaleOptions",
  ]),
  shell("scaleYContinuous", "position-continuous", "ContinuousPositionScaleOptions", [
    "ContinuousPositionScaleOptions",
  ]),
  shell("scaleXLog10", "position-continuous", "TransformedPositionScaleOptions", [
    "TransformedPositionScaleOptions",
  ]),
  shell("scaleYLog10", "position-continuous", "TransformedPositionScaleOptions", [
    "TransformedPositionScaleOptions",
  ]),
  shell("scaleXSqrt", "position-continuous", "TransformedPositionScaleOptions", [
    "TransformedPositionScaleOptions",
  ]),
  shell("scaleYSqrt", "position-continuous", "TransformedPositionScaleOptions", [
    "TransformedPositionScaleOptions",
  ]),
  // Inline Omit — there is no exported named type. Do NOT widen.
  shell(
    "scaleXReverse",
    "position-continuous",
    'Omit<ContinuousPositionScaleOptions, "transform" | "reverse">',
    ["ContinuousPositionScaleOptions"],
  ),
  shell(
    "scaleYReverse",
    "position-continuous",
    'Omit<ContinuousPositionScaleOptions, "transform" | "reverse">',
    ["ContinuousPositionScaleOptions"],
  ),

  // --- position-binned (2) -------------------------------------------------
  shell("scaleXBinned", "position-binned", "ContinuousPositionScaleOptions", [
    "ContinuousPositionScaleOptions",
  ]),
  shell("scaleYBinned", "position-binned", "ContinuousPositionScaleOptions", [
    "ContinuousPositionScaleOptions",
  ]),

  // --- position-temporal (4) -----------------------------------------------
  shell("scaleXDate", "position-temporal", "TemporalScaleOptions", ["TemporalScaleOptions"]),
  shell("scaleXDatetime", "position-temporal", "TemporalScaleOptions", ["TemporalScaleOptions"]),
  shell("scaleYDate", "position-temporal", "TemporalScaleOptions", ["TemporalScaleOptions"]),
  shell("scaleYDatetime", "position-temporal", "TemporalScaleOptions", ["TemporalScaleOptions"]),

  // --- position-discrete (2) -----------------------------------------------
  shell("scaleXDiscrete", "position-discrete", "DiscretePositionScaleOptions", [
    "DiscretePositionScaleOptions",
  ]),
  shell("scaleYDiscrete", "position-discrete", "DiscretePositionScaleOptions", [
    "DiscretePositionScaleOptions",
  ]),

  // --- color-fill (18 components + 9 Colour aliases) -----------------------
  // optionsTypes match the slice-3 hand-written shells exactly.
  shell(
    "scaleColorContinuous",
    "color-fill",
    "SequentialColorScaleOptions",
    ["SequentialColorScaleOptions"],
    colourAliases("Continuous"),
  ),
  shell(
    "scaleColorDiscrete",
    "color-fill",
    "DiscreteColorScaleOptions",
    ["DiscreteColorScaleOptions"],
    colourAliases("Discrete"),
  ),
  shell(
    "scaleColorBinned",
    "color-fill",
    "BinnedColorScaleOptions",
    ["BinnedColorScaleOptions"],
    colourAliases("Binned"),
  ),
  shell(
    "scaleColorLog10",
    "color-fill",
    "TransformedColorScaleOptions",
    ["TransformedColorScaleOptions"],
    colourAliases("Log10"),
  ),
  shell(
    "scaleColorSqrt",
    "color-fill",
    "TransformedColorScaleOptions",
    ["TransformedColorScaleOptions"],
    colourAliases("Sqrt"),
  ),
  shell(
    "scaleColorDate",
    "color-fill",
    "TemporalColorScaleOptions",
    ["TemporalColorScaleOptions"],
    colourAliases("Date"),
  ),
  shell(
    "scaleColorDatetime",
    "color-fill",
    "TemporalColorScaleOptions",
    ["TemporalColorScaleOptions"],
    colourAliases("Datetime"),
  ),
  shell(
    "scaleColorManual",
    "color-fill",
    "ManualColorScaleOptions",
    ["ManualColorScaleOptions"],
    colourAliases("Manual"),
  ),
  shell(
    "scaleColorIdentity",
    "color-fill",
    "IdentityColorScaleOptions",
    ["IdentityColorScaleOptions"],
    colourAliases("Identity"),
  ),
  shell("scaleFillContinuous", "color-fill", "SequentialColorScaleOptions", [
    "SequentialColorScaleOptions",
  ]),
  shell("scaleFillDiscrete", "color-fill", "DiscreteColorScaleOptions", [
    "DiscreteColorScaleOptions",
  ]),
  shell("scaleFillBinned", "color-fill", "BinnedColorScaleOptions", ["BinnedColorScaleOptions"]),
  shell("scaleFillLog10", "color-fill", "TransformedColorScaleOptions", [
    "TransformedColorScaleOptions",
  ]),
  shell("scaleFillSqrt", "color-fill", "TransformedColorScaleOptions", [
    "TransformedColorScaleOptions",
  ]),
  shell("scaleFillDate", "color-fill", "TemporalColorScaleOptions", ["TemporalColorScaleOptions"]),
  shell("scaleFillDatetime", "color-fill", "TemporalColorScaleOptions", [
    "TemporalColorScaleOptions",
  ]),
  shell("scaleFillManual", "color-fill", "ManualColorScaleOptions", ["ManualColorScaleOptions"]),
  shell("scaleFillIdentity", "color-fill", "IdentityColorScaleOptions", [
    "IdentityColorScaleOptions",
  ]),

  // --- numeric-style (21) --------------------------------------------------
  ...(["Size", "Linewidth", "Alpha"] as const).flatMap((aes) => {
    const base = `scale${aes}`;
    return [
      shell(`${base}Continuous`, "numeric-style", "SequentialStyleScaleOptions", [
        "SequentialStyleScaleOptions",
      ]),
      shell(`${base}Discrete`, "numeric-style", "DiscreteNumericStyleScaleOptions", [
        "DiscreteNumericStyleScaleOptions",
      ]),
      shell(`${base}Binned`, "numeric-style", "SequentialStyleScaleOptions", [
        "SequentialStyleScaleOptions",
      ]),
      shell(`${base}Date`, "numeric-style", "TemporalNumericStyleScaleOptions", [
        "TemporalNumericStyleScaleOptions",
      ]),
      shell(`${base}Datetime`, "numeric-style", "TemporalNumericStyleScaleOptions", [
        "TemporalNumericStyleScaleOptions",
      ]),
      shell(`${base}Manual`, "numeric-style", "ManualNumericStyleScaleOptions", [
        "ManualNumericStyleScaleOptions",
      ]),
      shell(`${base}Identity`, "numeric-style", "IdentityNumericStyleScaleOptions", [
        "IdentityNumericStyleScaleOptions",
      ]),
    ];
  }),

  // --- finite-style (8) — generics MUST be pinned to the aesthetic ----------
  shell("scaleShapeDiscrete", "finite-style", "DiscreteFiniteStyleScaleOptions<PointShapeName>", [
    "DiscreteFiniteStyleScaleOptions",
    "PointShapeName",
  ]),
  shell("scaleShapeBinned", "finite-style", "BinnedFiniteStyleScaleOptions<PointShapeName>", [
    "BinnedFiniteStyleScaleOptions",
    "PointShapeName",
  ]),
  shell("scaleShapeManual", "finite-style", "ManualFiniteStyleScaleOptions<PointShapeName>", [
    "ManualFiniteStyleScaleOptions",
    "PointShapeName",
  ]),
  shell("scaleShapeIdentity", "finite-style", "IdentityFiniteStyleScaleOptions<PointShapeName>", [
    "IdentityFiniteStyleScaleOptions",
    "PointShapeName",
  ]),
  shell("scaleLinetypeDiscrete", "finite-style", "DiscreteFiniteStyleScaleOptions<LinetypeName>", [
    "DiscreteFiniteStyleScaleOptions",
    "LinetypeName",
  ]),
  shell("scaleLinetypeBinned", "finite-style", "BinnedFiniteStyleScaleOptions<LinetypeName>", [
    "BinnedFiniteStyleScaleOptions",
    "LinetypeName",
  ]),
  shell("scaleLinetypeManual", "finite-style", "ManualFiniteStyleScaleOptions<LinetypeName>", [
    "ManualFiniteStyleScaleOptions",
    "LinetypeName",
  ]),
  shell("scaleLinetypeIdentity", "finite-style", "IdentityFiniteStyleScaleOptions<LinetypeName>", [
    "IdentityFiniteStyleScaleOptions",
    "LinetypeName",
  ]),
];

// ---------------------------------------------------------------------------
// Paths + markers
// ---------------------------------------------------------------------------

export const SCALE_DIR = "packages/svelte/src/lib/scale";
export const INDEX_PATH = "packages/svelte/src/lib/index.ts";

export const REGION_START = "// <generated:scale-children> — bun run scale:children:gen";
export const REGION_END = "// </generated:scale-children>";

export const GENERATED_HEADER =
  "<!-- GENERATED by scripts/gen-scale-children.ts — do not edit. Run: bun run scale:children:gen -->";

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------

/** Render one shell .svelte source. Pure — unit-tested; prettier-stable (printWidth 80). */
export function renderShell(spec: ShellSpec): string {
  // Match prettier: single-line import when it fits, multi-line otherwise.
  let importBlock: string;
  if (spec.typeImports.length === 1) {
    const single = `  import { ${spec.helper}, type ${spec.typeImports[0]} } from "@ggsvelte/spec";`;
    if (single.length <= 80) {
      importBlock = single;
    } else {
      importBlock = [
        `  import {`,
        `    ${spec.helper},`,
        `    type ${spec.typeImports[0]},`,
        `  } from "@ggsvelte/spec";`,
      ].join("\n");
    }
  } else {
    importBlock = [
      `  import {`,
      `    ${spec.helper},`,
      ...spec.typeImports.map((name) => `    type ${name},`),
      `  } from "@ggsvelte/spec";`,
    ].join("\n");
  }
  // Long Omit annotations exceed printWidth; wrap the `= $props()` assignment.
  const propsSingle = `  const props: ${spec.optionsType} = $props();`;
  const propsBlock =
    propsSingle.length > 80 ? `  const props: ${spec.optionsType} =\n    $props();` : propsSingle;
  // Multi-line factory import: single-line form exceeds prettier printWidth 80
  // (`createPlotLayer, definedProps` from `../layers/plot-layer.svelte.js`).
  const factoryImport = [
    `  import {`,
    `    createPlotLayer,`,
    `    definedProps,`,
    `  } from "../layers/plot-layer.svelte.js";`,
  ].join("\n");
  // createPlotLayer("scale", () => helper(definedProps(props))) — longest
  // helper names still fit printWidth 80 (e.g. scaleLinewidthContinuous).
  const createCall = `  createPlotLayer("scale", () => ${spec.helper}(definedProps(props)));`;
  return [
    GENERATED_HEADER,
    `<script lang="ts">`,
    importBlock,
    factoryImport,
    ``,
    propsBlock,
    createCall,
    `</script>`,
    ``,
  ].join("\n");
}

/** One lifecycle-tagged export line (form gen-lifecycle already parses). */
function exportLine(asName: string, fileComponent: string): string {
  return [
    `/** @lifecycle stable-intent */`,
    `export { default as ${asName} } from "./scale/${fileComponent}.svelte";`,
  ].join("\n");
}

/** Render the full delimited index region body (markers included). Pure. */
export function renderIndexRegion(manifest: readonly ShellSpec[] = SHELL_MANIFEST): string {
  const lines: string[] = [REGION_START];
  for (const spec of manifest) {
    lines.push(exportLine(spec.component, spec.component));
  }
  for (const spec of manifest) {
    for (const alias of spec.aliases ?? []) {
      lines.push(exportLine(alias, spec.component));
    }
  }
  lines.push(REGION_END);
  return lines.join("\n");
}

/**
 * Rewrite the delimited region in index.ts source. FAILS HARD if either
 * marker is missing — never silently appends.
 */
export function rewriteIndexRegion(source: string, region: string = renderIndexRegion()): string {
  const startIdx = source.indexOf(REGION_START);
  const endIdx = source.indexOf(REGION_END);
  if (startIdx === -1 || endIdx === -1) {
    const missing =
      startIdx === -1 && endIdx === -1
        ? "both markers"
        : startIdx === -1
          ? `start marker (${REGION_START})`
          : `end marker (${REGION_END})`;
    throw new Error(
      `scale-children index region markers missing (${missing}). ` +
        `Expected both:\n  ${REGION_START}\n  ${REGION_END}\n` +
        `in ${INDEX_PATH}. Refusing to append silently.`,
    );
  }
  if (endIdx < startIdx) {
    throw new Error(
      `scale-children index region markers out of order in ${INDEX_PATH}: ` +
        `end marker appears before start marker.`,
    );
  }
  // Include the end marker line fully (through its trailing newline if any).
  const endLineEnd = endIdx + REGION_END.length;
  const afterEnd = source.slice(endLineEnd);
  const consumedEnd = afterEnd.startsWith("\n") ? endLineEnd + 1 : endLineEnd;
  return source.slice(0, startIdx) + region + "\n" + source.slice(consumedEnd);
}

/** Relative path of a shell file from repo root. */
export function shellRelPath(component: string): string {
  return `${SCALE_DIR}/${component}.svelte`;
}

// ---------------------------------------------------------------------------
// Completeness helpers (exported for tests)
// ---------------------------------------------------------------------------

/** CamelCase helpers across all families, excluding Colour spellings. */
export function expectedCamelHelpers(): Set<string> {
  const out = new Set<string>();
  for (const cap of SCALE_CAPABILITIES) {
    for (const h of cap.helpers) {
      if (h.includes("_")) continue;
      if (h.includes("Colour")) continue;
      out.add(h);
    }
  }
  return out;
}

/** Colour-spelled camelCase helpers → component alias names. */
export function expectedColourAliases(): Set<string> {
  const out = new Set<string>();
  for (const cap of SCALE_CAPABILITIES) {
    for (const h of cap.helpers) {
      if (h.includes("_")) continue;
      if (!h.includes("Colour")) continue;
      out.add("S" + h.slice(1));
    }
  }
  return out;
}

export function manifestHelpers(): Set<string> {
  return new Set(SHELL_MANIFEST.map((s) => s.helper));
}

export function manifestAliases(): Set<string> {
  const out = new Set<string>();
  for (const s of SHELL_MANIFEST) {
    for (const a of s.aliases ?? []) out.add(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI (#783 shared protocol)
// ---------------------------------------------------------------------------

export interface GenerateResult {
  wrote: string[];
  unchanged: string[];
  indexChanged: boolean;
}

function scaleChildrenGroup(repoRoot: string) {
  const shellMembers = SHELL_MANIFEST.map((spec) => {
    const rel = shellRelPath(spec.component);
    return defineArtifact({
      path: join(repoRoot, rel),
      label: rel,
      regenerateWith: "scale:children:gen",
      build: () => renderShell(spec),
    });
  });
  const indexMember = defineArtifact({
    path: join(repoRoot, INDEX_PATH),
    label: INDEX_PATH,
    regenerateWith: "scale:children:gen",
    build: () => {
      const indexAbs = join(repoRoot, INDEX_PATH);
      // Index always exists; rewrite the generated region in place.
      return rewriteIndexRegion(readFileSync(indexAbs, "utf8"));
    },
  });
  return defineArtifactGroup({
    regenerateWith: "scale:children:gen",
    members: [...shellMembers, indexMember],
    // Intentionally no orphan Scale*.svelte scan — current --check is first-stale only.
  });
}

export function generateScaleChildren(opts: { repoRoot: string; check?: boolean }): GenerateResult {
  const { repoRoot, check = false } = opts;
  const wrote: string[] = [];
  const unchanged: string[] = [];
  let indexChanged = false;

  // Keep the programmatic API for tests; CLI routes through defineArtifactGroup.
  for (const spec of SHELL_MANIFEST) {
    const rel = shellRelPath(spec.component);
    const abs = join(repoRoot, rel);
    const fresh = renderShell(spec);
    const current = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    if (current === fresh) {
      unchanged.push(rel);
      continue;
    }
    if (check) {
      throw new Error(
        current === null
          ? `${rel} is MISSING. Run: bun run scale:children:gen`
          : `${rel} is STALE. Run: bun run scale:children:gen`,
      );
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, fresh);
    wrote.push(rel);
  }

  const indexAbs = join(repoRoot, INDEX_PATH);
  const indexSrc = readFileSync(indexAbs, "utf8");
  const freshIndex = rewriteIndexRegion(indexSrc);
  if (freshIndex !== indexSrc) {
    indexChanged = true;
    if (check) {
      throw new Error(`${INDEX_PATH} generated region is STALE. Run: bun run scale:children:gen`);
    }
    writeFileSync(indexAbs, freshIndex);
  }

  return { wrote, unchanged, indexChanged };
}

if (import.meta.main) {
  const repoRoot = join(import.meta.dir, "..");
  const group = scaleChildrenGroup(repoRoot);
  try {
    if (process.argv.includes("--check")) {
      await group.check();
      console.log(
        `scale children are current (${String(SHELL_MANIFEST.length)} shells, ` +
          `${String(manifestAliases().size)} aliases).`,
      );
    } else {
      await group.write();
      console.log(
        `scale children generated (${String(SHELL_MANIFEST.length)} shells, ` +
          `${String(manifestAliases().size)} aliases).`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
