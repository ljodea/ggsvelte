/**
 * Spec validation — tier 1 (schema shape, no data needed) plus structural
 * grammar checks, and tier 2 (data-aware, opt-in via options).
 *
 * Tier-1 mechanism (decision 0004): TypeBox `Value.Check`/`Value.Errors` over
 * the same schemas that emit `schema/v0.json` — one artifact, no drift.
 * TypeBox's raw union errors are noisy ("Expected union value" + all-branch
 * chatter), so this module implements the discriminator-aware error walk the
 * decision record budgeted for:
 *
 *  - layers are validated per-branch, selected by the `geom` discriminator
 *    (unknown geoms get a did-you-mean instead of union noise);
 *  - channel unions, data unions, and literal unions are classified by their
 *    `$ref`/const members into catalog codes with concrete fixes.
 *
 * Structural checks (still data-free) enforce grammar rules the schema alone
 * cannot express: required channels per geom, the bar/count-stat y ban, and
 * the rule geom's two honest forms (annotation intercepts XOR mapped aes).
 *
 * Tier 2 runs when an `options` argument is passed: data-aware checks against
 * the spec's inline data or a caller-provided DataProfile (validate-data.ts),
 * under documented input limits.
 *
 * Output: `{ ok: true, spec }` or `{ ok: false, errors: SpecError[] }` with
 * the agent error contract from errors.ts. Messages are snapshot-tested.
 */
import type { ValueError } from "@sinclair/typebox/errors";
import { ValueErrorType } from "@sinclair/typebox/errors";
import { Value } from "@sinclair/typebox/value";

import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import type { SpecAdvisory } from "./lint.js";
import { lintSpec } from "./lint.js";
import type { Aes, ChannelName, PortableSpec } from "./schema.js";
import {
  AreaLayerSchema,
  BarLayerSchema,
  BoxplotLayerSchema,
  ColLayerSchema,
  DensityLayerSchema,
  ErrorbarLayerSchema,
  GEOM_DEFAULTS,
  HistogramLayerSchema,
  KNOWN_GEOMS,
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
  effectiveChannel,
  jsonDepth,
  resolveFieldEvidence,
} from "./validate-data.js";

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

const CHANNEL_FIX_EXAMPLE = { field: "column_name" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function lastSegment(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

interface UnionMemberInfo {
  refs: string[];
  consts: string[];
  allConst: boolean;
}

function unionMembers(schema: unknown): UnionMemberInfo {
  const info: UnionMemberInfo = { refs: [], consts: [], allConst: true };
  const anyOf =
    isRecord(schema) && Array.isArray(schema["anyOf"]) ? (schema["anyOf"] as unknown[]) : [];
  for (const member of anyOf) {
    if (!isRecord(member)) continue;
    const ref = member["$ref"];
    if (typeof ref === "string") info.refs.push(ref);
    const c = member["const"];
    if (typeof c === "string" || typeof c === "number" || typeof c === "boolean") {
      info.consts.push(String(c));
    } else {
      info.allConst = false;
    }
  }
  if (anyOf.length === 0) info.allConst = false;
  return info;
}

/** Map one TypeBox ValueError into the agent error contract. */
function mapValueError(error: ValueError, pathPrefix: string): SpecError {
  const path = pathPrefix + error.path;
  const key = lastSegment(error.path);

  switch (error.type) {
    case ValueErrorType.ObjectAdditionalProperties: {
      const properties =
        isRecord(error.schema) && isRecord(error.schema["properties"])
          ? Object.keys(error.schema["properties"])
          : [];
      const suggestion = didYouMean(key, properties);
      return {
        code: "unexpected-property",
        path,
        message:
          `Unknown property "${key}".` +
          (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
        allowed: properties,
        ...(suggestion !== undefined && {
          fix: { description: `Rename "${key}" to "${suggestion}".` },
        }),
      };
    }
    case ValueErrorType.ObjectRequiredProperty:
      return {
        code: "missing-property",
        path,
        message: `Missing required property "${key}".`,
      };
    case ValueErrorType.NumberMinimum:
    case ValueErrorType.NumberMaximum:
    case ValueErrorType.NumberExclusiveMinimum:
    case ValueErrorType.NumberExclusiveMaximum: {
      const s: Record<string, unknown> = isRecord(error.schema) ? error.schema : {};
      const bounds: string[] = [];
      if (typeof s["minimum"] === "number") bounds.push(`>= ${s["minimum"]}`);
      if (typeof s["exclusiveMinimum"] === "number") bounds.push(`> ${s["exclusiveMinimum"]}`);
      if (typeof s["maximum"] === "number") bounds.push(`<= ${s["maximum"]}`);
      if (typeof s["exclusiveMaximum"] === "number") bounds.push(`< ${s["exclusiveMaximum"]}`);
      return {
        code: "value-out-of-range",
        path,
        message: `Value ${JSON.stringify(error.value)} for "${key}" is out of range (must be ${bounds.join(" and ")}).`,
        fix: { description: `Set "${key}" to a number ${bounds.join(" and ")}.` },
      };
    }
    case ValueErrorType.Literal: {
      const allowed =
        isRecord(error.schema) && error.schema["const"] !== undefined
          ? [String(error.schema["const"])]
          : [];
      return {
        code: "invalid-enum-value",
        path,
        message: `Invalid value ${JSON.stringify(error.value)} for "${key}"; the only supported value is ${allowed.map((a) => `"${a}"`).join(", ")}.`,
        allowed,
      };
    }
    case ValueErrorType.Union: {
      const members = unionMembers(error.schema);
      if (members.refs.includes("FieldRef")) {
        const bareString = typeof error.value === "string";
        return {
          code: "invalid-channel-value",
          path,
          message: bareString
            ? `Channel "${key}" is the bare string ${JSON.stringify(error.value)}; portable specs require the canonical form {"field": ${JSON.stringify(error.value)}}.`
            : `Channel "${key}" must be {"field": ...}, {"value": ...}, {"stat": ...}, or null.`,
          fix: {
            description: `Use a canonical channel form, e.g. {"field": "column_name"} to map "${key}" to a data column.`,
            example: bareString ? { field: error.value as string } : CHANNEL_FIX_EXAMPLE,
          },
        };
      }
      if (members.refs.includes("DataValues")) {
        return {
          code: "invalid-data",
          path,
          message: `Data must be one of {"values": [...rows]}, {"columns": {...arrays}}, or {"name": "dataset"}.`,
          allowed: ["values", "columns", "name"],
          fix: {
            description: 'Wrap inline rows as {"values": [...]}.',
            example: { values: [{ x: 1, y: 2 }] },
          },
        };
      }
      if (members.allConst) {
        const suggestion =
          typeof error.value === "string" ? didYouMean(error.value, members.consts) : undefined;
        return {
          code: "invalid-enum-value",
          path,
          message:
            `Invalid value ${JSON.stringify(error.value)} for "${key}"; allowed: ${members.consts.map((c) => `"${c}"`).join(", ")}.` +
            (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
          allowed: members.consts,
          ...(suggestion !== undefined && {
            fix: { description: `Set "${key}" to "${suggestion}".` },
          }),
        };
      }
      return {
        code: "invalid-type",
        path,
        message: `${error.message} at "${key}".`,
      };
    }
    default:
      return {
        code: "invalid-type",
        path,
        message: `${error.message}${path === "" ? "" : ` at "${key}"`} (got ${JSON.stringify(error.value)}).`,
      };
  }
}

function unknownGeomError(geom: unknown, layerPath: string): SpecError {
  const allowed = [...KNOWN_GEOMS];
  if (typeof geom !== "string") {
    return {
      code: "missing-geom",
      path: `${layerPath}/geom`,
      message: `Every layer needs a "geom" discriminator. Allowed geoms: ${allowed.map((g) => `"${g}"`).join(", ")}.`,
      allowed,
      fix: {
        description: "Add a geom to the layer.",
        example: { geom: "point" },
      },
    };
  }
  const suggestion = didYouMean(geom, allowed);
  return {
    code: "unknown-geom",
    path: `${layerPath}/geom`,
    message:
      `Unknown geom "${geom}". Allowed geoms: ${allowed.map((g) => `"${g}"`).join(", ")}.` +
      (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    allowed,
    ...(suggestion !== undefined && {
      fix: { description: `Set geom to "${suggestion}".`, example: { geom: suggestion } },
    }),
  };
}

// ---------------------------------------------------------------------------
// Structural grammar checks (data-free; rules the schema cannot express)
// ---------------------------------------------------------------------------

/** Channels every geom needs mapped (after plot-aes inheritance). */
const REQUIRED_CHANNELS: Record<string, ChannelName[]> = {
  point: ["x", "y"],
  line: ["x", "y"],
  col: ["x", "y"],
  bar: ["x"],
  histogram: ["x"],
  area: ["x", "y"],
  rule: [], // form-checked separately
  text: ["x", "y", "label"],
  smooth: ["x", "y"],
  boxplot: ["x", "y"],
  density: ["x"],
  errorbar: ["x"], // ymin/ymax vs y are stat-dependent, checked separately
};

function hasIntercepts(layer: Record<string, unknown>): boolean {
  const params = layer["params"];
  if (!isRecord(params)) return false;
  return params["xintercept"] !== undefined || params["yintercept"] !== undefined;
}

/** Grammar checks for one schema-valid layer. */
function layerStructuralErrors(
  layer: Record<string, unknown>,
  geom: string,
  index: number,
  plotAes: Aes | undefined,
): SpecError[] {
  const errors: SpecError[] = [];
  const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
  const layerPath = `/layers/${index}`;
  const mapped = (channel: ChannelName) => effectiveChannel(plotAes, layerAes, channel);

  if (geom === "rule") {
    const intercepts = hasIntercepts(layer);
    // The annotation form inherits NO plot aes (normalize drops it, matching
    // ggplot2's inherit.aes = FALSE) — only the layer's OWN x/y mappings
    // conflict with intercepts.
    const own = (channel: "x" | "y") => layerAes?.[channel] ?? undefined;
    const x = intercepts ? own("x") : mapped("x");
    const y = intercepts ? own("y") : mapped("y");
    if (intercepts && (x !== undefined || y !== undefined)) {
      errors.push({
        code: "rule-form-ambiguous",
        path: layerPath,
        message:
          "This rule layer mixes the annotation form (params.xintercept/yintercept) with mapped aes.x/aes.y. Use fixed intercepts OR a data mapping, never both.",
        fix: {
          description:
            "Remove the intercept params (data-driven form), or unset aes.x/aes.y with null (annotation form).",
          example: { geom: "rule", aes: { x: null, y: null }, params: { yintercept: 0 } },
        },
      });
    } else if (!intercepts && x === undefined && y === undefined) {
      errors.push({
        code: "rule-form-missing",
        path: layerPath,
        message:
          "This rule layer has neither fixed intercepts (params.xintercept/yintercept) nor a mapped aes.x/aes.y — nothing to draw.",
        fix: {
          description:
            "Set params.yintercept (or xintercept) for an annotation, or map aes.x/aes.y to a field for data-driven rules.",
          example: { geom: "rule", params: { yintercept: 0 } },
        },
      });
    } else if (!intercepts && x !== undefined && y !== undefined) {
      errors.push({
        code: "rule-both-axes",
        path: layerPath,
        message:
          "This rule layer maps BOTH aes.x and aes.y; a data-driven rule is either vertical (map x) or horizontal (map y). Unset the other channel with null.",
        fix: {
          description: "Keep one direction and unset the other channel with null.",
          example: { geom: "rule", aes: { y: null } },
        },
      });
    }
    return errors;
  }

  const stat =
    typeof layer["stat"] === "string"
      ? layer["stat"]
      : (GEOM_DEFAULTS[geom as keyof typeof GEOM_DEFAULTS]?.stat ?? "identity");

  if (geom === "bar" || geom === "histogram") {
    const y = mapped("y");
    if (y !== undefined && !("stat" in y)) {
      errors.push({
        code: "computed-y-mapped",
        path: `${layerPath}/aes/y`,
        message: `The ${geom} geom computes y with the ${stat} stat, so aes.y must not map data. Use geom "col" for pre-computed heights, or unset y with null.`,
        fix: {
          description: 'Switch the layer to geom "col" (identity stat) to draw mapped y values.',
          example: { geom: "col" },
        },
      });
    }
  }

  if (geom === "density") {
    const y = mapped("y");
    if (y !== undefined && !("stat" in y)) {
      errors.push({
        code: "computed-y-mapped",
        path: `${layerPath}/aes/y`,
        message:
          "The density geom computes y with the density stat, so aes.y must not map data. Map only x, or unset y with null.",
        fix: {
          description: "Remove the y mapping (or unset an inherited one with null).",
          example: { geom: "density", aes: { y: null } },
        },
      });
    }
  }

  if (geom === "bar" || geom === "histogram") {
    const params = isRecord(layer["params"]) ? layer["params"] : {};
    const binStat = geom === "histogram" || stat === "bin";
    if (binStat && params["center"] !== undefined && params["boundary"] !== undefined) {
      errors.push({
        code: "bin-center-and-boundary",
        path: `${layerPath}/params`,
        message:
          "The bin stat accepts params.center OR params.boundary (both align the bin grid), never both.",
        fix: {
          description: "Keep one alignment parameter and remove the other.",
          example: { params: { binwidth: 1, boundary: 0 } },
        },
      });
    }
  }

  if (geom === "errorbar") {
    const needed: ChannelName[] = stat === "summary" ? ["y"] : ["ymin", "ymax"];
    for (const channel of needed) {
      if (mapped(channel) === undefined) {
        errors.push({
          code: "missing-required-channel",
          path: `${layerPath}/aes/${channel}`,
          message: `The errorbar geom with the ${stat} stat requires a "${channel}" channel; map it in the layer's aes or the plot-level aes.`,
          fix: {
            description: `Map "${channel}" to a data field.`,
            example: { [channel]: CHANNEL_FIX_EXAMPLE },
          },
        });
      }
    }
  }

  for (const channel of REQUIRED_CHANNELS[geom] ?? []) {
    if ((geom === "bar" || geom === "histogram" || geom === "density") && channel !== "x") {
      continue;
    }
    if (mapped(channel) === undefined) {
      errors.push({
        code: "missing-required-channel",
        path: `${layerPath}/aes/${channel}`,
        message: `The ${geom} geom requires a "${channel}" channel; map it in the layer's aes or the plot-level aes.`,
        fix: {
          description: `Map "${channel}" to a data field.`,
          example: { [channel]: CHANNEL_FIX_EXAMPLE },
        },
      });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// validate()
// ---------------------------------------------------------------------------

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
  const schemaValid = Value.Check(PlotSpecSchema, input);

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
        for (const valueError of Value.Errors(branch, layer)) {
          errors.push(mapValueError(valueError, layerPath));
        }
      }
    }

    // --- everything else: check with layers replaced by a known-valid layer,
    // so the plot-level walk never re-reports layer noise. -------------------
    const shell = { ...input, layers: [{ geom: "point" }] };
    for (const valueError of Value.Errors(PlotSpecSchema, shell)) {
      errors.push(mapValueError(valueError, ""));
    }

    if (errors.length === 0) {
      // Value.Check failed but neither walk produced a mapped error: surface a
      // generic failure rather than lie with ok:true.
      errors.push({
        code: "invalid-type",
        path: "",
        message: "The spec does not match the schema.",
      });
    }
  }

  // --- tier 2 (opt-in via options): structural grammar checks ----------------
  // Required channels, the bar/count y ban, and the rule form rules are part
  // of the tier-2 contract (the pipeline enforces them at render time with
  // equivalent structured errors); tier 1 stays schema-shape-only so partial
  // specs remain composable.
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
  if (options !== undefined && isRecord(input) && isRecord(input["facet"])) {
    const facet = input["facet"];
    const hasWrap = facet["wrap"] !== undefined;
    const hasGrid = facet["rows"] !== undefined || facet["cols"] !== undefined;
    if (hasWrap && hasGrid) {
      errors.push({
        code: "facet-form-ambiguous",
        path: "/facet",
        message:
          "This facet mixes the wrap form (facet.wrap) with the grid form (facet.rows/facet.cols). Use wrap OR rows/cols, never both.",
        fix: {
          description: "Keep facet.wrap (and drop rows/cols), or keep rows/cols (and drop wrap).",
          example: { wrap: { field: "group" }, ncol: 3 },
        },
      });
    } else if (!hasWrap && !hasGrid) {
      errors.push({
        code: "facet-form-missing",
        path: "/facet",
        message:
          "This facet sets neither wrap nor rows/cols — there is no field to partition panels by.",
        fix: {
          description: "Set facet.wrap (wrap form) or facet.rows/facet.cols (grid form).",
          example: { wrap: { field: "group" } },
        },
      });
    }
    if (facet["ncol"] !== undefined && !hasWrap) {
      errors.push({
        code: "facet-ncol-without-wrap",
        path: "/facet/ncol",
        message:
          "facet.ncol only applies to the wrap form; the grid form's columns come from facet.cols' distinct values.",
        fix: { description: "Remove ncol, or switch to the wrap form." },
      });
    }
  }

  // --- tier 2 (opt-in): data-aware checks + optional lint --------------------
  // Resolve field evidence once so dataChecks and lintSpec share the same
  // pivot + type-inference pass over large inline data.
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
