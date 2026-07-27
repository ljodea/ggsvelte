/**
 * gen-geom-children — generates declaration-only <Geom*> shells for every
 * KNOWN_GEOMS entry (#1039). Param keys live in GEOM_PARAM_KEYS; shells only
 * wire types + createGeomLayer.
 *
 * Manifest-driven: component order matches the pre-generation index export
 * order (lifecycle.json is order-sensitive). Naming is derived
 * (snake_case → GeomPascal); the manifest asserts that derivation.
 *
 * Usage:
 *   bun scripts/gen-geom-children.ts           # (re)write shells + index region
 *   bun scripts/gen-geom-children.ts --check   # exit 1 on drift without writing
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { KNOWN_GEOMS, type GeomName } from "@ggsvelte/spec";

import { defineArtifact, defineArtifactGroup } from "./artifact.ts";

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export type ShellKind = "default" | "jitter";

export interface ShellSpec {
  /** Wire geom name, e.g. "bin_2d". */
  geom: GeomName;
  /** PascalCase component name, e.g. "GeomBin2d". */
  component: string;
  /** Params type export, e.g. "HexParams". */
  paramsType: string;
  /** LayerInput type export, e.g. "HexLayerInput". */
  layerInput: string;
  /** Special shell template (jitter merges flat width/height/seed). */
  kind: ShellKind;
}

/** snake_case geom → GeomPascalCase component name. */
export function componentNameForGeom(geom: string): string {
  const pascal = geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Geom${pascal}`;
}

/** snake_case geom → PascalCase LayerInput name prefix (without LayerInput). */
function pascalGeom(geom: string): string {
  return geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Params type name for each geom (must match SpecDeclarations layer refs).
 * histogram/freqpoly/count/jitter share another geom's params type.
 */
const PARAMS_TYPE: Record<GeomName, string> = {
  point: "PointParams",
  line: "LineParams",
  path: "PathParams",
  col: "ColParams",
  bar: "BarParams",
  histogram: "BarParams",
  freqpoly: "LineParams",
  area: "AreaParams",
  rule: "RuleParams",
  hline: "HlineParams",
  vline: "VlineParams",
  text: "TextParams",
  label: "LabelParams",
  smooth: "SmoothParams",
  quantile: "QuantileParams",
  boxplot: "BoxplotParams",
  density: "DensityParams",
  errorbar: "ErrorbarParams",
  linerange: "LinerangeParams",
  pointrange: "PointrangeParams",
  crossbar: "CrossbarParams",
  rect: "RectParams",
  tile: "TileParams",
  raster: "RasterParams",
  ribbon: "RibbonParams",
  segment: "SegmentParams",
  count: "PointParams",
  violin: "ViolinParams",
  function: "FunctionParams",
  polygon: "PolygonParams",
  hex: "HexParams",
  bin_2d: "Bin2dParams",
  abline: "AblineParams",
  curve: "CurveParams",
  contour: "ContourParams",
  density_2d: "Density2dParams",
  density_2d_filled: "Density2dParams",
  dotplot: "DotplotParams",
  map: "MapParams",
  sf: "SfParams",
  sf_text: "SfTextParams",
  sf_label: "SfLabelParams",
  blank: "BlankParams",
  jitter: "PointParams",
  spoke: "SpokeParams",
  rug: "RugParams",
  step: "StepParams",
  qq: "QqParams",
  qq_line: "QqLineParams",
};

/**
 * Export order matches the pre-#1039 index (lifecycle.json is order-sensitive).
 * Every KNOWN_GEOMS entry appears exactly once.
 */
const EXPORT_ORDER: readonly GeomName[] = [
  "point",
  "count",
  "contour",
  "dotplot",
  "line",
  "path",
  "col",
  "bar",
  "area",
  "rule",
  "hline",
  "vline",
  "jitter",
  "text",
  "label",
  "histogram",
  "freqpoly",
  "smooth",
  "quantile",
  "boxplot",
  "density",
  "density_2d",
  "density_2d_filled",
  "errorbar",
  "linerange",
  "pointrange",
  "crossbar",
  "rect",
  "tile",
  "bin_2d",
  "raster",
  "hex",
  "ribbon",
  "segment",
  "violin",
  "function",
  "polygon",
  "abline",
  "curve",
  "map",
  "sf",
  "sf_text",
  "sf_label",
  "blank",
  "spoke",
  "rug",
  "step",
  "qq",
  "qq_line",
];

function shell(geom: GeomName): ShellSpec {
  return {
    geom,
    component: componentNameForGeom(geom),
    paramsType: PARAMS_TYPE[geom],
    layerInput: `${pascalGeom(geom)}LayerInput`,
    kind: geom === "jitter" ? "jitter" : "default",
  };
}

export const SHELL_MANIFEST: readonly ShellSpec[] = EXPORT_ORDER.map((geom) => shell(geom));

// ---------------------------------------------------------------------------
// Paths + markers
// ---------------------------------------------------------------------------

export const GEOM_DIR = "packages/svelte/src/lib/geoms";
export const INDEX_PATH = "packages/svelte/src/lib/index.ts";

export const REGION_START = "// <generated:geom-children> — bun run geom:children:gen";
export const REGION_END = "// </generated:geom-children>";

export const GENERATED_HEADER =
  "<!-- GENERATED by scripts/gen-geom-children.ts — do not edit. Run: bun run geom:children:gen -->";

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------

const DATA_OVERRIDE = "data?: DataInput | readonly Record<string, unknown>[]";

/**
 * Type import block matching prettier-plugin-svelte: short lists stay
 * single-line; longer lists (jitter) multi-line.
 */
function typeImportBlock(spec: ShellSpec): string {
  if (spec.kind === "jitter") {
    return [
      `  import type {`,
      `    DataInput,`,
      `    PositionParams,`,
      `    ${spec.paramsType},`,
      `    ${spec.layerInput},`,
      `  } from "@ggsvelte/spec";`,
    ].join("\n");
  }
  const single = `  import type { DataInput, ${spec.paramsType}, ${spec.layerInput} } from "@ggsvelte/spec";`;
  if (single.length <= 80) return single;
  return [
    `  import type {`,
    `    DataInput,`,
    `    ${spec.paramsType},`,
    `    ${spec.layerInput},`,
    `  } from "@ggsvelte/spec";`,
  ].join("\n");
}

/** Props type expression matching prettier brace layout. */
function propsTypeExpr(spec: ShellSpec): string {
  return (
    `${spec.paramsType} &\n` +
    `    Omit<${spec.layerInput}, "geom" | "params" | "data"> & {\n` +
    `      ${DATA_OVERRIDE};\n` +
    `    }`
  );
}

/** Render one shell .svelte source. Pure — unit-tested; prettier-stable. */
export function renderShell(spec: ShellSpec): string {
  if (spec.kind === "jitter") {
    return renderJitterShell(spec);
  }
  return [
    GENERATED_HEADER,
    `<script lang="ts">`,
    typeImportBlock(spec),
    ``,
    `  import { createGeomLayer } from "./factory.svelte.js";`,
    ``,
    `  const props: ${propsTypeExpr(spec)} = $props();`,
    `  createGeomLayer("${spec.geom}", () => props);`,
    `</script>`,
    ``,
  ].join("\n");
}

/**
 * GeomJitter: flat width/height/seed assemble into positionParams (ggplot2
 * geom_jitter sugar). Param whitelist is still PointParams via the factory.
 */
function renderJitterShell(spec: ShellSpec): string {
  const propsType =
    `${spec.paramsType} &\n` +
    `    Omit<${spec.layerInput}, "geom" | "params" | "data"> & {\n` +
    `      ${DATA_OVERRIDE};\n` +
    `      /** Maximum horizontal jitter (data units / band-step fraction). */\n` +
    `      width?: number;\n` +
    `      /** Maximum vertical jitter (data units / band-step fraction). */\n` +
    `      height?: number;\n` +
    `      /** Seeded RNG seed (ggsvelte jitter is always seeded; default 42). */\n` +
    `      seed?: number;\n` +
    `    }`;
  return [
    GENERATED_HEADER,
    `<script lang="ts">`,
    typeImportBlock(spec),
    ``,
    `  import { createGeomLayer } from "./factory.svelte.js";`,
    ``,
    `  const props: ${propsType} = $props();`,
    `  createGeomLayer("${spec.geom}", () => {`,
    `    const { width, height, seed, positionParams, ...rest } = props;`,
    `    const merged: PositionParams = {`,
    `      ...positionParams,`,
    `      ...(width !== undefined && { width }),`,
    `      ...(height !== undefined && { height }),`,
    `      ...(seed !== undefined && { seed }),`,
    `    };`,
    `    return {`,
    `      ...rest,`,
    `      ...(Object.keys(merged).length > 0 && { positionParams: merged }),`,
    `    };`,
    `  });`,
    `</script>`,
    ``,
  ].join("\n");
}

function exportLine(component: string): string {
  return [
    `/** @lifecycle stable-intent */`,
    `export { default as ${component} } from "./geoms/${component}.svelte";`,
  ].join("\n");
}

/** Render the full delimited index region body (markers included). Pure. */
export function renderIndexRegion(manifest: readonly ShellSpec[] = SHELL_MANIFEST): string {
  const lines: string[] = [REGION_START];
  for (const spec of manifest) {
    lines.push(exportLine(spec.component));
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
      `geom-children index region markers missing (${missing}). ` +
        `Expected both:\n  ${REGION_START}\n  ${REGION_END}\n` +
        `in ${INDEX_PATH}. Refusing to append silently.`,
    );
  }
  if (endIdx < startIdx) {
    throw new Error(
      `geom-children index region markers out of order in ${INDEX_PATH}: ` +
        `end marker appears before start marker.`,
    );
  }
  const endLineEnd = endIdx + REGION_END.length;
  const afterEnd = source.slice(endLineEnd);
  const consumedEnd = afterEnd.startsWith("\n") ? endLineEnd + 1 : endLineEnd;
  return source.slice(0, startIdx) + region + "\n" + source.slice(consumedEnd);
}

/** Relative path of a shell file from repo root. */
export function shellRelPath(component: string): string {
  return `${GEOM_DIR}/${component}.svelte`;
}

// ---------------------------------------------------------------------------
// Completeness helpers (exported for tests)
// ---------------------------------------------------------------------------

export function manifestGeoms(): Set<string> {
  return new Set(SHELL_MANIFEST.map((s) => s.geom));
}

export function expectedGeoms(): Set<string> {
  return new Set(KNOWN_GEOMS);
}

// ---------------------------------------------------------------------------
// CLI (#783 shared protocol)
// ---------------------------------------------------------------------------

export interface GenerateResult {
  wrote: string[];
  unchanged: string[];
  indexChanged: boolean;
}

function geomChildrenGroup(repoRoot: string) {
  const shellMembers = SHELL_MANIFEST.map((spec) => {
    const rel = shellRelPath(spec.component);
    return defineArtifact({
      path: join(repoRoot, rel),
      label: rel,
      regenerateWith: "geom:children:gen",
      build: () => renderShell(spec),
    });
  });
  const indexMember = defineArtifact({
    path: join(repoRoot, INDEX_PATH),
    label: INDEX_PATH,
    regenerateWith: "geom:children:gen",
    build: () => {
      const indexAbs = join(repoRoot, INDEX_PATH);
      return rewriteIndexRegion(readFileSync(indexAbs, "utf8"));
    },
  });
  return defineArtifactGroup({
    regenerateWith: "geom:children:gen",
    members: [...shellMembers, indexMember],
  });
}

export function generateGeomChildren(opts: { repoRoot: string; check?: boolean }): GenerateResult {
  const { repoRoot, check = false } = opts;
  const wrote: string[] = [];
  const unchanged: string[] = [];
  let indexChanged = false;

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
          ? `${rel} is MISSING. Run: bun run geom:children:gen`
          : `${rel} is STALE. Run: bun run geom:children:gen`,
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
      throw new Error(`${INDEX_PATH} generated region is STALE. Run: bun run geom:children:gen`);
    }
    writeFileSync(indexAbs, freshIndex);
  }

  return { wrote, unchanged, indexChanged };
}

if (import.meta.main) {
  const repoRoot = join(import.meta.dir, "..");
  const group = geomChildrenGroup(repoRoot);
  try {
    if (process.argv.includes("--check")) {
      await group.check();
      console.log(`geom children are current (${String(SHELL_MANIFEST.length)} shells).`);
    } else {
      await group.write();
      console.log(`geom children generated (${String(SHELL_MANIFEST.length)} shells).`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
