/**
 * Spec lint — advisories for VALID-but-questionable specs (Hadley lesson 16:
 * "we can produce many plots that don't make sense, yet are grammatically
 * valid"). `lintSpec()` never errors and never blocks: it returns
 * `SpecAdvisory[]` — high value for agent-generated charts, where a
 * grammatically valid spec can still be a meaningless plot.
 *
 * Distinct from the two error tiers (validate()) and from the pipeline's
 * heuristic advisories (@ggsvelte/core `RenderModel.advisories`): lint runs
 * BEFORE any pipeline, on the spec alone (plus inline data or a DataProfile
 * when available — data-dependent rules skip silently without evidence).
 *
 * Rules considered and deliberately ABSENT (documented for auditability):
 *  - dual-axis misuse: the grammar has no dual axes — unrepresentable.
 *  - pie-chart equivalents: no polar coord in v1 — unrepresentable.
 *  - text layer without a label aes: that is a validation ERROR
 *    (`missing-required-channel`), not an advisory.
 *  - log scale over entirely non-positive data: the pipeline handles it via
 *    the `log-nonpositive` warning / `log-domain-not-positive` error; the
 *    lint advisory here fires on MIXED-sign data, where the silent row-drop
 *    is most surprising.
 *
 * Wired into `validate(spec, { lint: true })` (advisories ride the result)
 * and into the `ggsvelte-render` CLI (stderr JSON lines, kind "advisory",
 * source "spec-lint").
 */
import type { JSONValue } from "./portability.js";
import type { Aes, CellValue, ChannelName, PositionScaleSpec } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema.js";
import type { ProfileFieldType, ValidateOptions } from "./validate-data.js";
import { effectiveChannel, inferProfileType, inlineColumns } from "./validate-data.js";

/** One lint advisory: never an error, always actionable. */
export interface SpecAdvisory {
  code: LintAdvisoryCode;
  /** JSON pointer into the spec ("" = root). */
  path: string;
  message: string;
  suggestion?: {
    description: string;
    example?: JSONValue;
  };
}

/** One entry of the lint catalog (docs render straight from it). */
export interface LintCatalogEntry {
  summary: string;
  /** What evidence the rule needs ("spec" alone, or inline data / profile). */
  needs: "spec" | "data" | "data-or-profile";
  rationale: string;
}

/** The lint-advisory catalog — the single source for the docs page. */
export const LINT_CATALOG = {
  "line-over-nominal-x": {
    summary: "A line layer connects points across a nominal (unordered) x field.",
    needs: "data-or-profile",
    rationale:
      "Lines encode order; connecting unordered categories draws meaningless slopes. Use col/bar for per-category values, or declare the field ordinal if it is genuinely ordered.",
  },
  "many-discrete-colors": {
    summary: "A discrete color/fill field has more than 10 distinct values.",
    needs: "data",
    rationale:
      "Beyond ~10 hues, colors stop being distinguishable and the default palette cycles. Facet by the field, aggregate it, or pin an explicit domain + range.",
  },
  "stacked-area-negative": {
    summary: "A stacked area layer's y field contains negative values.",
    needs: "data",
    rationale:
      'Stacked areas imply parts of a whole; negative contributions make band boundaries cross and mislead. Use a line layer per series, or position: "identity".',
  },
  "discrete-discrete-scatter": {
    summary: "A point layer maps discrete fields on BOTH x and y.",
    needs: "data-or-profile",
    rationale:
      "Discrete-by-discrete points overplot into a grid where counts are invisible. Jitter the points, or count the combinations and encode the count.",
  },
  "log-nonpositive-data": {
    summary: "A log scale is configured over data that mixes positive and non-positive values.",
    needs: "data",
    rationale:
      "Log scales silently drop zero/negative rows (the pipeline warns at render). Filter the data deliberately, or use a linear scale.",
  },
} as const satisfies Record<string, LintCatalogEntry>;

export type LintAdvisoryCode = keyof typeof LINT_CATALOG;

// ---------------------------------------------------------------------------
// Field-type evidence (inline data or DataProfile; absent = rules skip)
// ---------------------------------------------------------------------------

interface FieldEvidence {
  type: ProfileFieldType | null;
  /** Raw column values (inline data only; null for profile-backed fields). */
  values: readonly CellValue[] | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function buildEvidence(
  spec: Record<string, unknown>,
  options: ValidateOptions | undefined,
): Map<string, FieldEvidence> | null {
  const fields = new Map<string, FieldEvidence>();
  if (options?.profile !== undefined) {
    const profile = options.profile;
    if (!Array.isArray(profile.fields)) return null;
    for (const f of profile.fields) {
      if (isRecord(f) && typeof f.name === "string") {
        fields.set(f.name, { type: f.type ?? null, values: null });
      }
    }
    return fields;
  }
  const columns = inlineColumns(spec);
  if (columns === null) return null;
  for (const [name, values] of Object.entries(columns)) {
    fields.set(name, { type: inferProfileType(values), values });
  }
  return fields;
}

const DISCRETE: ReadonlySet<ProfileFieldType> = new Set(["nominal", "ordinal"]);

// ---------------------------------------------------------------------------
// lintSpec
// ---------------------------------------------------------------------------

/**
 * Lint a spec for valid-but-questionable constructs. `options` mirrors
 * validate(): pass `{ profile }` to lint against out-of-band data, or let the
 * spec's inline data provide the evidence. Rules whose evidence is missing
 * skip silently — lint never fabricates a complaint.
 */
export function lintSpec(spec: unknown, options?: ValidateOptions): SpecAdvisory[] {
  if (!isRecord(spec) || !Array.isArray(spec["layers"])) return [];
  const advisories: SpecAdvisory[] = [];
  const evidence = buildEvidence(spec, options);
  const plotAes = isRecord(spec["aes"]) ? (spec["aes"] as Aes) : undefined;
  const layers = spec["layers"] as unknown[];
  const scales = isRecord(spec["scales"]) ? spec["scales"] : undefined;

  const fieldOf = (
    layerAes: Aes | undefined,
    channel: ChannelName,
  ): { field: string; info: FieldEvidence } | null => {
    const mapped = effectiveChannel(plotAes, layerAes, channel);
    if (mapped === undefined || !("field" in mapped)) return null;
    const info = evidence?.get(mapped.field);
    if (info === undefined) return null;
    return { field: mapped.field, info };
  };

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
        const distinct = new Set(values.filter((v) => v !== null)).size;
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

  // --- log-nonpositive-data (scale-level, once per axis) ----------------------
  for (const axis of ["x", "y"] as const) {
    const config = scales?.[axis] as PositionScaleSpec | undefined;
    if (config?.type !== "log") continue;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!isRecord(layer)) continue;
      const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
      const use = fieldOf(layerAes, axis);
      const values = use?.info.values;
      if (use === null || values === null || values === undefined) continue;
      let positive = 0;
      let nonPositive = 0;
      for (const v of values) {
        if (typeof v !== "number") continue;
        if (v > 0) positive++;
        else nonPositive++;
      }
      if (positive > 0 && nonPositive > 0) {
        advisories.push({
          code: "log-nonpositive-data",
          path: `/scales/${axis}`,
          message: `scales.${axis} is a log scale, but field "${use.field}" has ${nonPositive} non-positive value(s) alongside ${positive} positive — those rows will be silently dropped at render.`,
          suggestion: {
            description:
              "Filter the non-positive rows deliberately, or use a linear scale if zero/negative values are meaningful.",
          },
        });
        break; // one advisory per axis is enough
      }
    }
  }

  return advisories;
}
