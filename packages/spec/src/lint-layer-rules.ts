/**
 * Layer-scoped lint rules: line-over-nominal-x, discrete-discrete-scatter,
 * stacked-area-negative, many-discrete-colors.
 * Scale-level rules: lint-scale-rules.ts. Orchestrator: lint.ts.
 */
import type { Aes, ChannelName } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema-catalog.js";
import type { FieldEvidenceEntry, ProfileFieldType } from "./validate-data.js";
import type { SpecAdvisory } from "./lint.js";

const DISCRETE: ReadonlySet<ProfileFieldType> = new Set(["nominal", "ordinal"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Distinct non-null values in a column (single pass, no intermediate filter). */
function countDistinctNonNull(values: readonly unknown[]): number {
  const distinct = new Set<unknown>();
  for (const value of values) {
    if (value !== null) distinct.add(value);
  }
  return distinct.size;
}

export type LintFieldOf = (
  layerAes: Aes | undefined,
  channel: ChannelName,
) => { field: string; info: FieldEvidenceEntry } | null;

/** Layer-scoped advisories for one lintSpec pass. */
export function collectLayerLintAdvisories(input: {
  layers: unknown[];
  fieldOf: LintFieldOf;
}): SpecAdvisory[] {
  const { layers, fieldOf } = input;
  const advisories: SpecAdvisory[] = [];

  // FieldEvidenceMap is built once per lintSpec/validate call; distinct counts
  // for many-discrete-colors are memoized across layers/channels that share a
  // field so a high-cardinality column is scanned O(n), not O(L·n).
  const distinctNonNullByField = new Map<string, number>();
  // Same contract for stacked-area-negative: one scan per y field, not per
  // layer. Field name is a safe key because lint evidence is one plot-level
  // map per pass (lintSpec builds or receives a single FieldEvidenceMap), so
  // a field name always resolves to the same values array within one call.
  // If lint ever gains layer-scoped evidence, key on the values array instead.
  const hasNegativeByField = new Map<string, boolean>();

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!isRecord(layer)) continue;
    const geom = typeof layer["geom"] === "string" ? layer["geom"] : "";
    const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
    const defaults = GEOM_DEFAULTS[geom as keyof typeof GEOM_DEFAULTS];
    const position =
      typeof layer["position"] === "string"
        ? layer["position"]
        : (defaults?.position ?? "identity");
    addLineAdvisory({ advisories, fieldOf, geom, layerAes, index: i });
    addScatterAdvisory({ advisories, fieldOf, geom, layerAes, position, index: i });
    addAreaAdvisory({
      advisories,
      fieldOf,
      geom,
      layerAes,
      position,
      index: i,
      hasNegativeByField,
    });
    addColorAdvisories({
      advisories,
      fieldOf,
      layerAes,
      index: i,
      distinctNonNullByField,
    });
  }

  return advisories;
}

interface LayerLintContext {
  advisories: SpecAdvisory[];
  fieldOf: LintFieldOf;
  geom: string;
  layerAes: Aes | undefined;
  index: number;
}

function addLineAdvisory(ctx: LayerLintContext): void {
  if (ctx.geom !== "line" && ctx.geom !== "step") return;
  const x = ctx.fieldOf(ctx.layerAes, "x");
  if (x === null || x.info.type !== "nominal") return;
  ctx.advisories.push({
    code: "line-over-nominal-x",
    path: `/layers/${ctx.index}/aes/x`,
    message: `This ${ctx.geom} layer connects points across "${x.field}", a nominal (unordered) field — the line's slopes carry no meaning.`,
    suggestion: {
      description:
        'Use geom "col" (or "bar" with the count stat) for per-category values; keep "line"/"step" only for ordered x (numbers, dates, or a genuinely ordinal field).',
      example: { geom: "col" },
    },
  });
}

function addScatterAdvisory(ctx: LayerLintContext & { position: string }): void {
  if (ctx.geom !== "point" || ctx.position === "jitter") return;
  const x = ctx.fieldOf(ctx.layerAes, "x");
  const y = ctx.fieldOf(ctx.layerAes, "y");
  if (x === null || y === null || x.info.type === null || y.info.type === null) return;
  if (!DISCRETE.has(x.info.type) || !DISCRETE.has(y.info.type)) return;
  ctx.advisories.push({
    code: "discrete-discrete-scatter",
    path: `/layers/${ctx.index}`,
    message: `This point layer maps discrete fields on both axes ("${x.field}" × "${y.field}") — identical combinations overplot invisibly.`,
    suggestion: {
      description:
        'Add position: "jitter" to spread the points, or count the combinations and encode the count (e.g. point size).',
      example: { geom: "point", position: "jitter" },
    },
  });
}

function addAreaAdvisory(
  ctx: LayerLintContext & { position: string; hasNegativeByField: Map<string, boolean> },
): void {
  if (ctx.geom !== "area" || (ctx.position !== "stack" && ctx.position !== "fill")) return;
  const y = ctx.fieldOf(ctx.layerAes, "y");
  const values = y?.info.values;
  if (y === null || values === null || values === undefined) return;
  let hasNegative = ctx.hasNegativeByField.get(y.field);
  if (hasNegative === undefined) {
    hasNegative = values.some((value) => typeof value === "number" && value < 0);
    ctx.hasNegativeByField.set(y.field, hasNegative);
  }
  if (!hasNegative) return;
  ctx.advisories.push({
    code: "stacked-area-negative",
    path: `/layers/${ctx.index}/aes/y`,
    message: `This stacked area layer's y field "${y.field}" contains negative values — stacked bands will cross and misread as parts of a whole.`,
    suggestion: {
      description:
        'Draw one line per series instead, or set position: "identity" to overlap the areas.',
      example: { geom: "area", position: "identity" },
    },
  });
}

function addColorAdvisories(
  ctx: Omit<LayerLintContext, "geom"> & { distinctNonNullByField: Map<string, number> },
): void {
  for (const channel of ["color", "fill"] as const) {
    const color = ctx.fieldOf(ctx.layerAes, channel);
    const values = color?.info.values;
    if (color === null || values === null || values === undefined || color.info.type === null)
      continue;
    if (!DISCRETE.has(color.info.type)) continue;
    let distinct = ctx.distinctNonNullByField.get(color.field);
    if (distinct === undefined) {
      distinct = countDistinctNonNull(values);
      ctx.distinctNonNullByField.set(color.field, distinct);
    }
    if (distinct <= 10) continue;
    ctx.advisories.push({
      code: "many-discrete-colors",
      path: `/layers/${ctx.index}/aes/${channel}`,
      message: `Field "${color.field}" maps ${distinct} distinct values to ${channel} — beyond ~10, hues stop being distinguishable and the default palette cycles.`,
      suggestion: {
        description: `Facet by "${color.field}", aggregate it to fewer categories, or pin scales.${channel}.domain (+ a range) to the values that matter.`,
        example: { facet: { wrap: { field: color.field } } },
      },
    });
  }
}
