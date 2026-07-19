/**
 * Spec validation orchestrator — tier 1 (schema shape) plus opt-in tier 2
 * (structural grammar, data-aware checks, optional lint).
 *
 * Tier-1 mechanism (decision 0004): TypeBox 1.x `Value.Check`/`Value.Errors`
 * over the same schemas that emit `schema/v0.json` — one artifact, no drift.
 * Raw TypeBox union noise is mapped to the agent error contract in
 * validate-map-errors.ts. Data-free grammar rules live in
 * validate-structure.ts. Data-aware checks live in validate-data*.ts
 * (evidence + checks modules, barrel at validate-data.ts).
 *
 * Output: `{ ok: true, spec }` or `{ ok: false, errors: SpecError[] }` with
 * the agent error contract from errors.ts. Messages are snapshot-tested.
 */
import { Settings } from "typebox/system";
import { Value } from "typebox/value";

import type { SpecError } from "./errors.js";
import type { SpecAdvisory } from "./lint.js";
import { lintSpec } from "./lint.js";
import type { Aes, PortableSpec } from "./schema.js";
import {
  AreaLayerSchema,
  BarLayerSchema,
  BoxplotLayerSchema,
  ColLayerSchema,
  DensityLayerSchema,
  ErrorbarLayerSchema,
  HistogramLayerSchema,
  LineLayerSchema,
  PlotSpecSchema,
  PointLayerSchema,
  RuleLayerSchema,
  SmoothLayerSchema,
  TextLayerSchema,
} from "./schema.js";
import type { ValidateOptions } from "./validate-data.js";
import {
  dataChecks,
  DEFAULT_VALIDATE_LIMITS,
  jsonDepth,
  resolveFieldEvidence,
} from "./validate-data.js";
import { mapValueErrors, unknownGeomError } from "./validate-map-errors.js";
import { facetStructuralErrors, layerStructuralErrors } from "./validate-structure.js";

export type ValidateResult =
  | { ok: true; spec: PortableSpec; advisories?: SpecAdvisory[] }
  | { ok: false; errors: SpecError[]; advisories?: SpecAdvisory[] };

const GEOM_BRANCHES = {
  point: PointLayerSchema,
  line: LineLayerSchema,
  col: ColLayerSchema,
  bar: BarLayerSchema,
  histogram: HistogramLayerSchema,
  area: AreaLayerSchema,
  rule: RuleLayerSchema,
  text: TextLayerSchema,
  smooth: SmoothLayerSchema,
  boxplot: BoxplotLayerSchema,
  density: DensityLayerSchema,
  errorbar: ErrorbarLayerSchema,
} as const;

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
  // SpecImportSchema is a structural Cyclic root; Static<> on it is not useful
  // for control-flow (collapses), so treat Check as a plain boolean.
  const schemaValid: boolean = Value.Check(PlotSpecSchema, input);

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

    // TypeBox 1 defaults maxErrors to 8; honor our documented maxDiagnostics
    // so enum fan-out and multi-field failures aren't truncated before mapping.
    const previousMaxErrors = Settings.Get().maxErrors;
    Settings.Set({ maxErrors: Math.max(limits.maxDiagnostics, previousMaxErrors) });
    try {
      // --- layers: discriminator-aware, branch-selected validation ------------
      const layers = input["layers"];
      if (!Array.isArray(layers)) {
        errors.push({
          code: "missing-layers",
          path: "/layers",
          message: `"layers" must be an array of layer objects (got ${layers === undefined ? "nothing" : typeof layers}).`,
          fix: {
            description: "Add a layers array with at least one layer.",
            example: [{ geom: "point" }],
          },
        });
      } else if (layers.length === 0) {
        errors.push({
          code: "empty-layers",
          path: "/layers",
          message: '"layers" must contain at least one layer.',
          fix: { description: "Add a layer.", example: [{ geom: "point" }] },
        });
      } else {
        for (let i = 0; i < layers.length; i++) {
          const layer: unknown = layers[i];
          const layerPath = `/layers/${i}`;
          if (!isRecord(layer)) {
            errors.push({
              code: "invalid-layer",
              path: layerPath,
              message: `Each layer must be an object with a "geom" (got ${typeof layer}).`,
              fix: { description: "Replace with a layer object.", example: { geom: "point" } },
            });
            continue;
          }
          const geom = layer["geom"];
          if (typeof geom !== "string" || !(geom in GEOM_BRANCHES)) {
            errors.push(unknownGeomError(geom, layerPath));
            continue;
          }
          const branch = GEOM_BRANCHES[geom as keyof typeof GEOM_BRANCHES];
          errors.push(
            ...mapValueErrors(Value.Errors(branch, layer), {
              schema: branch,
              value: layer,
              pathPrefix: layerPath,
            }),
          );
        }
      }

      // --- everything else: check with layers replaced by a known-valid layer,
      // so the plot-level walk never re-reports layer noise. -------------------
      const shell = { ...input, layers: [{ geom: "point" }] };
      errors.push(
        ...mapValueErrors(Value.Errors(PlotSpecSchema, shell), {
          schema: PlotSpecSchema,
          value: shell,
          pathPrefix: "",
        }),
      );

      if (errors.length === 0) {
        // Value.Check failed but neither walk produced a mapped error: surface a
        // generic failure rather than lie with ok:true.
        errors.push({
          code: "invalid-type",
          path: "",
          message: "The spec does not match the schema.",
        });
      }
    } finally {
      Settings.Set({ maxErrors: previousMaxErrors });
    }
  }

  // --- tier 2 (opt-in via options): structural grammar checks ----------------
  // Required channels, the bar/count y ban, and the rule form rules are part
  // of the tier-2 contract (the pipeline enforces them at render time with
  // equivalent structured errors); tier 1 stays schema-shape-only so partial
  // specs remain composable.
  // Eligibility: only record layers with a known geom whose branch passes
  // Value.Check (shape errors already reported above).
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
}
