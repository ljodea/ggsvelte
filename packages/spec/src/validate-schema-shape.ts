/**
 * Tier-1 schema shape walk: discriminator-aware layer branches + plot shell.
 *
 * Shared geom branch lookup (`GEOM_BRANCHES`) is also used by validate() to
 * gate tier-2 structural checks with Value.Check on known geoms.
 *
 * Orchestrator: validate.ts. Error mapping: validate-map-errors.ts.
 */
import { Value } from "typebox/value";

import type { SpecError } from "./errors.js";
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
import { mapValueErrors, unknownGeomError } from "./validate-map-errors.js";

/** Known geom → layer schema for branch-selected tier-1 walks and tier-2 eligibility. */
export const GEOM_BRANCHES = {
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

/** Discriminator-aware layer walk — one layer's tier-1 shape errors. */
function mapLayerShapeErrors(layer: unknown, layerPath: string): SpecError[] {
  if (!isRecord(layer)) {
    return [
      {
        code: "invalid-layer",
        path: layerPath,
        message: `Each layer must be an object with a "geom" (got ${typeof layer}).`,
        fix: { description: "Replace with a layer object.", example: { geom: "point" } },
      },
    ];
  }
  const geom = layer["geom"];
  if (typeof geom !== "string" || !(geom in GEOM_BRANCHES)) {
    return [unknownGeomError(geom, layerPath)];
  }
  const branch = GEOM_BRANCHES[geom as keyof typeof GEOM_BRANCHES];
  return mapValueErrors(Value.Errors(branch, layer), {
    schema: branch,
    value: layer,
    pathPrefix: layerPath,
  });
}

/**
 * Tier-1 schema walk (caller must set TypeBox Settings for the process).
 * Layer branch walk + plot-level shell so layer noise is not double-reported.
 */
export function collectSchemaShapeErrors(input: Record<string, unknown>): SpecError[] {
  const errors: SpecError[] = [];
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
      errors.push(...mapLayerShapeErrors(layers[i], `/layers/${i}`));
    }
  }

  // Plot-level walk with a known-valid layer shell so layer noise is not
  // re-reported alongside the branch-selected layer walk above.
  const shell = { ...input, layers: [{ geom: "point" }] };
  errors.push(
    ...mapValueErrors(Value.Errors(PlotSpecSchema, shell), {
      schema: PlotSpecSchema,
      value: shell,
      pathPrefix: "",
    }),
  );

  if (errors.length === 0) {
    // Value.Check failed but neither walk produced a mapped error.
    errors.push({
      code: "invalid-type",
      path: "",
      message: "The spec does not match the schema.",
    });
  }
  return errors;
}
