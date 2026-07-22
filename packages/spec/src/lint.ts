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
 *  - transform scale over entirely out-of-domain data: the pipeline handles
 *    it via the `scale-transform-domain` error (explicit limits) / warning
 *    (data), plus the applicable censor count; the lint advisory here fires on
 *    MIXED data (some in-domain, some out), where the silent row-drop is most
 *    surprising.
 *
 * Wired into `validate(spec, { lint: true })` (advisories ride the result)
 * and into the `ggsvelte-render` CLI (stderr JSON lines, kind "advisory",
 * source "spec-lint").
 */
import type { JSONValue } from "./portability.js";
import type { Aes, ChannelName, PositionScaleSpec } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema.js";
import type {
  FieldEvidenceEntry,
  FieldEvidenceMap,
  ProfileFieldType,
  ValidateOptions,
} from "./validate-data.js";
import {
  DEFAULT_VALIDATE_LIMITS,
  effectiveChannel,
  resolveFieldEvidence,
} from "./validate-data.js";

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
  "transform-domain-data": {
    summary:
      "A transform scale (log10/sqrt) is configured over data that mixes in-domain and out-of-domain values.",
    needs: "data",
    rationale:
      "log10 rejects values <= 0 and sqrt rejects values < 0; the transform silently drops out-of-domain rows before stats (the pipeline warns at render). Filter the data deliberately, or use an identity/linear scale if those values are meaningful.",
  },
} as const satisfies Record<string, LintCatalogEntry>;

export type LintAdvisoryCode = keyof typeof LINT_CATALOG;

// ---------------------------------------------------------------------------
// Field-type evidence (inline data or DataProfile; absent = rules skip)
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Standalone evidence build (lintSpec without a shared map from validate).
 * Merges options.limits into DEFAULT_VALIDATE_LIMITS the same way validate()
 * does, so callers can raise or lower maxRows/maxBytes and data-aware rules
 * honor the override (skip over-limit; never fabricate a complaint).
 */
function buildEvidence(
  spec: Record<string, unknown>,
  options: ValidateOptions | undefined,
): FieldEvidenceMap | null {
  const limits = { ...DEFAULT_VALIDATE_LIMITS, ...options?.limits };
  const resolved = resolveFieldEvidence(spec, options ?? {}, limits);
  return resolved.status === "ok" ? resolved.fields : null;
}

const DISCRETE: ReadonlySet<ProfileFieldType> = new Set(["nominal", "ordinal"]);

/** Forward-transform domain rule for a position scale, or null if none. */
interface TransformDomain {
  valid(value: number): boolean;
  /** Human label for the message ("log10" | "sqrt"). */
  label: string;
  /** Short description of the valid range ("positive" | "non-negative"). */
  rule: string;
}

/**
 * Resolve the effective forward-transform domain for a position scale, reading
 * the spec BEFORE normalization. Both the authored legacy `type: "log"` and the
 * canonical `transform: "log10" | "sqrt"` are covered; identity/time/untyped
 * scales return null.
 */
function transformDomainOf(config: PositionScaleSpec | undefined): TransformDomain | null {
  if (config === undefined) return null;
  const transform = config.transform ?? (config.type === "log" ? "log10" : undefined);
  if (transform === "log10") {
    return { valid: (v) => v > 0, label: "log10", rule: "positive" };
  }
  if (transform === "sqrt") {
    return { valid: (v) => v >= 0, label: "sqrt", rule: "non-negative" };
  }
  return null;
}

/** Count numeric values inside/outside a transform domain (non-numbers ignored). */
function countTransformDomain(
  values: readonly unknown[],
  domain: TransformDomain,
): readonly [inDomain: number, outOfDomain: number] {
  let inDomain = 0;
  let outOfDomain = 0;
  for (const v of values) {
    if (typeof v !== "number") continue;
    if (domain.valid(v)) inDomain++;
    else outOfDomain++;
  }
  return [inDomain, outOfDomain];
}

/** Distinct non-null values in a column (single pass, no intermediate filter). */
function countDistinctNonNull(values: readonly unknown[]): number {
  const distinct = new Set<unknown>();
  for (const value of values) {
    if (value !== null) distinct.add(value);
  }
  return distinct.size;
}

// ---------------------------------------------------------------------------
// lintSpec
// ---------------------------------------------------------------------------

/**
 * Lint a spec for valid-but-questionable constructs. `options` mirrors
 * validate(): pass `{ profile }` to lint against out-of-band data, or let the
 * spec's inline data provide the evidence; `options.limits` merges over
 * DEFAULT_VALIDATE_LIMITS the same way validate() does. Rules whose evidence
 * is missing (including over-limit inline data) skip silently — lint never
 * fabricates a complaint.
 *
 * When called from validate({ lint: true }), pass `sharedEvidence` so field
 * types/columns are not rebuilt after dataChecks already resolved them.
 */
export function lintSpec(
  spec: unknown,
  options?: ValidateOptions,
  sharedEvidence?: FieldEvidenceMap | null,
): SpecAdvisory[] {
  if (!isRecord(spec) || !Array.isArray(spec["layers"])) return [];
  const advisories: SpecAdvisory[] = [];
  const evidence = sharedEvidence === undefined ? buildEvidence(spec, options) : sharedEvidence;
  const plotAes = isRecord(spec["aes"]) ? (spec["aes"] as Aes) : undefined;
  const layers = spec["layers"] as unknown[];
  const scales = isRecord(spec["scales"]) ? spec["scales"] : undefined;

  const fieldOf = (
    layerAes: Aes | undefined,
    channel: ChannelName,
  ): { field: string; info: FieldEvidenceEntry } | null => {
    const mapped = effectiveChannel(plotAes, layerAes, channel);
    if (mapped === undefined || !("field" in mapped)) return null;
    const info = evidence?.get(mapped.field);
    if (info === undefined) return null;
    return { field: mapped.field, info };
  };

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

  // --- transform-domain-data (scale-level, once per axis) ---------------------
  // Detect the effective forward-transform domain BEFORE normalization: an
  // authored `type: "log"` (canonicalizes to transform: "log10") and a
  // canonical `transform: "log10" | "sqrt"` are all handled here. log10 rejects
  // values <= 0; sqrt rejects values < 0. The advisory fires only on MIXED data
  // (some in-domain, some out) — all-invalid is the pipeline's error/warning.
  //
  // Multi-layer charts often share the same mapped field (plot aes or repeated
  // layer aes). Memoize [inDomain, outOfDomain] per field name for this axis so
  // a shared column is scanned once (O(n)), not once per layer (O(L·n)).
  for (const axis of ["x", "y"] as const) {
    const config = scales?.[axis] as PositionScaleSpec | undefined;
    const domain = transformDomainOf(config);
    if (domain === null) continue;
    const fieldDomainCounts = new Map<string, readonly [inDomain: number, outOfDomain: number]>();
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!isRecord(layer)) continue;
      const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
      const use = fieldOf(layerAes, axis);
      const values = use?.info.values;
      if (use === null || values === null || values === undefined) continue;
      let counts = fieldDomainCounts.get(use.field);
      if (counts === undefined) {
        counts = countTransformDomain(values, domain);
        fieldDomainCounts.set(use.field, counts);
      }
      const [inDomain, outOfDomain] = counts;
      if (inDomain > 0 && outOfDomain > 0) {
        advisories.push({
          code: "transform-domain-data",
          path: `/scales/${axis}`,
          message: `scales.${axis} is a ${domain.label} scale, but field "${use.field}" has ${outOfDomain} value(s) outside its ${domain.rule} domain alongside ${inDomain} valid — those rows will be silently dropped before stats.`,
          suggestion: {
            description: `Filter the out-of-domain rows deliberately, or use an identity/linear scale if ${domain.rule} values are meaningful.`,
          },
        });
        break; // one advisory per axis is enough
      }
    }
  }

  return advisories;
}
