/**
 * Layer-scoped lint rules: line-over-nominal-x, discrete-discrete-scatter,
 * stacked-area-negative, many-discrete-colors.
 * Scale-level rules: lint-scale-rules.ts. Orchestrator: lint.ts.
 */
import type { Aes, ChannelName } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema.js";
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

    // --- line-over-nominal-x ------------------------------------------------
    if (geom === "line") {
      const x = fieldOf(layerAes, "x");
      if (x !== null && x.info.type === "nominal") {
        advisories.push({
          code: "line-over-nominal-x",
          path: `/layers/${i}/aes/x`,
          message: `This line layer connects points across "${x.field}", a nominal (unordered) field — the line's slopes carry no meaning.`,
          suggestion: {
            description:
              'Use geom "col" (or "bar" with the count stat) for per-category values; keep "line" only for ordered x (numbers, dates, or a genuinely ordinal field).',
            example: { geom: "col" },
          },
        });
      }
    }

    // --- discrete-discrete-scatter -------------------------------------------
    if (geom === "point" && position !== "jitter") {
      const x = fieldOf(layerAes, "x");
      const y = fieldOf(layerAes, "y");
      if (
        x !== null &&
        y !== null &&
        x.info.type !== null &&
        y.info.type !== null &&
        DISCRETE.has(x.info.type) &&
        DISCRETE.has(y.info.type)
      ) {
        advisories.push({
          code: "discrete-discrete-scatter",
          path: `/layers/${i}`,
          message: `This point layer maps discrete fields on both axes ("${x.field}" × "${y.field}") — identical combinations overplot invisibly.`,
          suggestion: {
            description:
              'Add position: "jitter" to spread the points, or count the combinations and encode the count (e.g. point size).',
            example: { geom: "point", position: "jitter" },
          },
        });
      }
    }

    // --- stacked-area-negative -----------------------------------------------
    if (geom === "area" && (position === "stack" || position === "fill")) {
      const y = fieldOf(layerAes, "y");
      const values = y?.info.values;
      if (y !== null && values !== null && values !== undefined) {
        const hasNegative = values.some((v) => typeof v === "number" && v < 0);
        if (hasNegative) {
          advisories.push({
            code: "stacked-area-negative",
            path: `/layers/${i}/aes/y`,
            message: `This stacked area layer's y field "${y.field}" contains negative values — stacked bands will cross and misread as parts of a whole.`,
            suggestion: {
              description:
                'Draw one line per series instead, or set position: "identity" to overlap the areas.',
              example: { geom: "area", position: "identity" },
            },
          });
        }
      }
    }

    // --- many-discrete-colors -------------------------------------------------
    for (const channel of ["color", "fill"] as const) {
      const c = fieldOf(layerAes, channel);
      const values = c?.info.values;
      if (
        c !== null &&
        values !== null &&
        values !== undefined &&
        c.info.type !== null &&
        DISCRETE.has(c.info.type)
      ) {
        let distinct = distinctNonNullByField.get(c.field);
        if (distinct === undefined) {
          distinct = countDistinctNonNull(values);
          distinctNonNullByField.set(c.field, distinct);
        }
        if (distinct > 10) {
          advisories.push({
            code: "many-discrete-colors",
            path: `/layers/${i}/aes/${channel}`,
            message: `Field "${c.field}" maps ${distinct} distinct values to ${channel} — beyond ~10, hues stop being distinguishable and the default palette cycles.`,
            suggestion: {
              description: `Facet by "${c.field}", aggregate it to fewer categories, or pin scales.${channel}.domain (+ a range) to the values that matter.`,
              example: { facet: { wrap: { field: c.field } } },
            },
          });
        }
      }
    }
  }

  return advisories;
}
