/**
 * Spec validation orchestrator — tier 1 (schema shape) plus opt-in tier 2
 * (structural grammar, data-aware checks, optional lint).
 *
 * Tier-1 mechanism (decision 0004): TypeBox 1.x compiled checks plus
 * `Value.Errors` over the same schemas that emit `schema/v0.json` — one
 * artifact, no drift.
 * Layer/plot shape walks: validate-schema-shape.ts (shared GEOM_BRANCHES).
 * Raw TypeBox union noise is mapped to the agent error contract in
 * validate-map-errors.ts (schema walk: validate-schema-walk.ts; channel/data
 * form classification: validate-map-forms.ts).
 * Data-free grammar rules live in validate-structure*.ts (layers / color
 * schemes / facet form). Data-aware checks live in validate-data*.ts
 * (evidence + checks modules, barrel at validate-data.ts).
 *
 * Output: `{ ok: true, spec }` or `{ ok: false, errors: SpecError[] }` with
 * the agent error contract from errors.ts. Messages are snapshot-tested.
 */
import Compile from "typebox/compile";
import { Settings } from "typebox/system";
import { Value } from "typebox/value";

import type { SpecError } from "./errors.js";
import type { SpecAdvisory } from "./lint.js";
import { lintSpec } from "./lint.js";
import type { Aes, PortableSpec } from "./schema.js";
import { PlotSpecSchema } from "./schema.js";
import type { ValidateOptions } from "./validate-data.js";
import {
  dataChecks,
  DEFAULT_VALIDATE_LIMITS,
  jsonDepth,
  resolveFieldEvidence,
} from "./validate-data.js";
import { collectSchemaShapeErrors, GEOM_BRANCHES } from "./validate-schema-shape.js";
import {
  colorScaleStructuralErrors,
  facetStructuralErrors,
  layerStructuralErrors,
} from "./validate-structure.js";

export type ValidateResult =
  | { ok: true; spec: PortableSpec; advisories?: SpecAdvisory[] }
  | { ok: false; errors: SpecError[]; advisories?: SpecAdvisory[] };

const PLOT_SPEC_VALIDATOR = (() => {
  const previousExactOptional = Settings.Get().exactOptionalPropertyTypes;
  Settings.Set({ exactOptionalPropertyTypes: true });
  try {
    return Compile(PlotSpecSchema);
  } finally {
    Settings.Set({ exactOptionalPropertyTypes: previousExactOptional });
  }
})();

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate a spec. Tier 1 (always): schema shape, no data needed. Tier 2
 * (opt-in — pass an `options` argument, even `{}`): the grammar's structural
 * rules (required channels per geom, bar/count y ban, rule forms) plus
 * data-aware checks against the spec's inline data or the provided
 * DataProfile, under documented input limits (DEFAULT_VALIDATE_LIMITS).
 *
 * On success, returns the input typed as PortableSpec (no copy is made).
 */
export function validate(input: unknown, options?: ValidateOptions): ValidateResult {
  const limits = { ...DEFAULT_VALIDATE_LIMITS, ...options?.limits };

  // Depth guard first: pathological nesting must not reach the schema walker.
  if (jsonDepth(input, limits.maxDepth) > limits.maxDepth) {
    return {
      ok: false,
      errors: [
        {
          code: "validation-limit",
          path: "",
          message: `The spec nests deeper than ${limits.maxDepth} levels (documented maxDepth limit); validation refused.`,
        },
      ],
    };
  }

  const errors: SpecError[] = [];
  // TypeBox Settings are process-global. Align with tsconfig exactOptionalPropertyTypes
  // and raise maxErrors so Value.Errors is not truncated at the default of 8.
  const previousMaxErrors = Settings.Get().maxErrors;
  const previousExactOptional = Settings.Get().exactOptionalPropertyTypes;
  Settings.Set({
    maxErrors: Math.max(limits.maxDiagnostics, previousMaxErrors),
    exactOptionalPropertyTypes: true,
  });
  try {
    // TypeBox's interpreted Value.Check walks the cyclic schema graph repeatedly
    // for every inline row. Reuse its compiled validator so large plots remain
    // interactive while preserving Value.Errors for detailed invalid diagnostics.
    const schemaValid: boolean = PLOT_SPEC_VALIDATOR.Check(input);

    if (!schemaValid) {
      if (!isRecord(input)) {
        return {
          ok: false,
          errors: [
            {
              code: "invalid-spec-root",
              path: "",
              message: `A plot spec must be a JSON object with a "layers" array (got ${Array.isArray(input) ? "an array" : typeof input}).`,
              fix: {
                description: "Provide an object with at least one layer.",
                example: {
                  layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
                },
              },
            },
          ],
        };
      }

      errors.push(...collectSchemaShapeErrors(input));
    }

    if (schemaValid && isRecord(input) && isRecord(input["scales"])) {
      errors.push(...colorScaleStructuralErrors(input["scales"]));
    }

    // --- tier 2 (opt-in via options): structural grammar checks ----------------
    // Required channels, the bar/count y ban, and the rule form rules are part
    // of the tier-2 contract (the pipeline enforces them at render time with
    // equivalent structured errors); tier 1 stays schema-shape-only so partial
    // specs remain composable.
    // Eligibility: only record layers with a known geom whose branch passes
    // Value.Check (shape errors already reported above). Uses shared GEOM_BRANCHES.
    if (options !== undefined && isRecord(input) && Array.isArray(input["layers"])) {
      const plotAes = isRecord(input["aes"]) ? (input["aes"] as Aes) : undefined;
      const layers = input["layers"] as unknown[];
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!isRecord(layer)) continue;
        const geom = layer["geom"];
        if (typeof geom !== "string" || !(geom in GEOM_BRANCHES)) continue;
        const branch = GEOM_BRANCHES[geom as keyof typeof GEOM_BRANCHES];
        if (!Value.Check(branch, layer)) continue; // shape errors already reported
        errors.push(...layerStructuralErrors(layer, geom, i, plotAes));
      }
    }

    // --- tier 2 (opt-in): facet form rules --------------------------------------
    // Runs for any record-valued facet, even when the facet is schema-invalid.
    if (options !== undefined && isRecord(input) && isRecord(input["facet"])) {
      errors.push(...facetStructuralErrors(input["facet"]));
    }

    // --- tier 2 (opt-in): data-aware checks + optional lint --------------------
    // Resolve field evidence once so dataChecks and lintSpec share the same
    // pivot + type-inference pass over large inline data. Still runs on record
    // roots even when schema/structural errors already accumulated.
    let advisories: SpecAdvisory[] | undefined;
    if (options !== undefined && isRecord(input)) {
      const resolved = resolveFieldEvidence(input, options, limits);
      errors.push(...dataChecks(input, options, limits, resolved));
      if (options.lint === true) {
        // Reuse the map on success; on none/errors pass null so lint does not
        // re-scan data that data-aware validation already refused or lacked.
        const shared = resolved.status === "ok" ? resolved.fields : null;
        advisories = lintSpec(input, options, shared);
      }
    }
    const withAdvisories = advisories !== undefined && advisories.length > 0 ? { advisories } : {};

    if (errors.length > limits.maxDiagnostics) {
      const kept = errors.slice(0, limits.maxDiagnostics);
      kept.push({
        code: "validation-limit",
        path: "",
        message: `Diagnostics truncated: ${errors.length} problems found, showing the first ${limits.maxDiagnostics} (documented maxDiagnostics limit).`,
      });
      return { ok: false, errors: kept, ...withAdvisories };
    }

    if (errors.length > 0) return { ok: false, errors, ...withAdvisories };
    return { ok: true, spec: input as PortableSpec, ...withAdvisories };
  } finally {
    Settings.Set({
      maxErrors: previousMaxErrors,
      exactOptionalPropertyTypes: previousExactOptional,
    });
  }
}
