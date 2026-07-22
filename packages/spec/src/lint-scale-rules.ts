/**
 * Scale-level lint rules: transform-domain-data.
 * Layer rules: lint-layer-rules.ts. Orchestrator: lint.ts.
 */
import type { Aes, PositionScaleSpec } from "./schema.js";
import type { SpecAdvisory } from "./lint.js";
import type { LintFieldOf } from "./lint-layer-rules.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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

/** Scale-scoped advisories for one lintSpec pass. */
export function collectScaleLintAdvisories(input: {
  layers: unknown[];
  scales: Record<string, unknown> | undefined;
  fieldOf: LintFieldOf;
}): SpecAdvisory[] {
  const { layers, scales, fieldOf } = input;
  const advisories: SpecAdvisory[] = [];

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
    const raw = scales?.[axis];
    // Schema-invalid scale entries must not throw — lint never blocks.
    if (raw !== undefined && !isRecord(raw)) continue;
    const config = raw as PositionScaleSpec | undefined;
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
