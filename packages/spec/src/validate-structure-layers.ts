/**
 * Data-free structural grammar checks for layers (required channels, rule forms,
 * computed-y bans, bin center/boundary, errorbar stat channels).
 * Color-scheme rules: validate-structure-scales.ts. Facet form: validate-structure-facet.ts.
 * Form families: validate-structure-layer-{rule,ribbon,computed-y,shared}.ts.
 * Barrel: validate-structure.ts.
 */
import type { SpecError } from "./errors.js";
import type { Aes, ChannelName, GeomName } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema.js";
import { STYLE_AESTHETIC_GEOMS, type StyleAesthetic } from "./capabilities.js";
import { effectiveChannel } from "./validate-data.js";
import { paintStructuralErrors } from "./validate-structure-paint.js";
import { computedYMappedErrors } from "./validate-structure-layer-computed-y.js";
import { hasGeomIntercepts, ruleFamilyStructuralErrors } from "./validate-structure-layer-rule.js";
import { ribbonStructuralErrors } from "./validate-structure-layer-ribbon.js";
import {
  CHANNEL_FIX_EXAMPLE,
  isRecord,
  pushMissingChannel,
} from "./validate-structure-layer-shared.js";

/**
 * Channels every geom needs mapped (after plot-aes inheritance).
 * Total over GeomName — a missing geom is a type error, not a silent `?? []`
 * (#1078). Empty lists are deliberate (form-checked elsewhere or annotation-only).
 */
const REQUIRED_CHANNELS: Record<GeomName, readonly ChannelName[]> = {
  point: ["x", "y"],
  count: ["x", "y"],
  jitter: ["x", "y"],
  line: ["x", "y"],
  path: ["x", "y"], // data-order polylines (#788); same channels as line
  step: ["x", "y"],
  col: ["x", "y"],
  bar: ["x"],
  histogram: ["x"],
  freqpoly: ["x"],
  area: ["x", "y"],
  rule: [], // form-checked separately
  hline: [], // form-checked like rule (yintercept / aes.y)
  vline: [], // form-checked like rule (xintercept / aes.x)
  text: ["x", "y", "label"],
  label: ["x", "y", "label"], // same contract as text (#1078)
  sf_text: ["label"], // x/y come from stat_sf_coordinates (#809 phase 2)
  sf_label: ["label"],
  sf: [], // geometry column, not aes
  smooth: ["x", "y"],
  boxplot: ["x", "y"],
  density: ["x"],
  errorbar: ["x"], // ymin/ymax vs y are stat-dependent, checked separately
  linerange: ["x"],
  pointrange: ["x"],
  crossbar: ["x"],
  rect: ["xmin", "xmax", "ymin", "ymax"],
  segment: ["x", "y", "xend", "yend"],
  violin: ["x", "y"],
  function: [], // domain from xlim / peer / optional x; y is after_stat
  polygon: ["x", "y"],
  spoke: ["x", "y"], // angle/radius: aes or params — checked below
  curve: ["x", "y", "xend", "yend"],
  rug: [], // sides-dependent; checked separately
  tile: ["x", "y"],
  raster: ["x", "y"],
  ribbon: [], // orientation-dependent; checked separately
  contour: ["x", "y", "z"],
  quantile: ["x", "y"],
  density_2d: ["x", "y"],
  density_2d_filled: ["x", "y"],
  hex: ["x", "y"],
  bin_2d: ["x", "y"],
  abline: [], // annotation-only: slope/intercept in params
  qq: ["sample"],
  qq_line: ["sample"],
  dotplot: ["x"],
  map: ["map_id"],
  blank: [], // trains whatever is mapped; nothing required
};

/** Grammar checks for one schema-valid layer. */
export function layerStructuralErrors(
  layer: Record<string, unknown>,
  geom: string,
  index: number,
  plotAes: Aes | undefined,
): SpecError[] {
  const errors: SpecError[] = [];
  const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
  const layerPath = `/layers/${index}`;
  const mapped = (channel: ChannelName) => effectiveChannel(plotAes, layerAes, channel);
  // Annotation-form rules / hline / vline (fixed intercepts) inherit NO plot
  // aes — normalize drops it — so a plot-level style meant for other layers
  // must not trip the geom-capability check here. Match the rule-form x/y
  // handling below by consulting only the layer's OWN aes for these layers.
  const isRuleFamily = geom === "rule" || geom === "hline" || geom === "vline";
  const annotationRule = isRuleFamily && hasGeomIntercepts(geom, layer);

  for (const aesthetic of Object.keys(STYLE_AESTHETIC_GEOMS) as StyleAesthetic[]) {
    const value = annotationRule ? (layerAes?.[aesthetic] ?? undefined) : mapped(aesthetic);
    if (value === undefined) continue;
    const compatible = STYLE_AESTHETIC_GEOMS[aesthetic] as readonly string[];
    if (compatible.includes(geom)) continue;
    errors.push({
      code: "unsupported-geom-aesthetic",
      path: `${layerPath}/aes/${aesthetic}`,
      message: `The ${geom} geom does not consume aes.${aesthetic}; supported geoms: ${compatible.join(", ")}.`,
      fix: {
        description: `Remove aes.${aesthetic} or move it to a compatible ${compatible[0]} layer.`,
      },
    });
  }

  if (isRuleFamily) {
    return ruleFamilyStructuralErrors(layer, geom, layerPath, layerAes, mapped);
  }

  const stat =
    typeof layer["stat"] === "string"
      ? layer["stat"]
      : (GEOM_DEFAULTS[geom as keyof typeof GEOM_DEFAULTS]?.stat ?? "identity");

  errors.push(...computedYMappedErrors(geom, stat, layerPath, mapped));

  if (
    geom === "bar" ||
    geom === "histogram" ||
    geom === "freqpoly" ||
    geom === "dotplot" ||
    (geom === "line" && (stat === "bin" || stat === "summary_bin")) ||
    (geom === "point" && stat === "summary_bin") ||
    (geom === "errorbar" && stat === "summary_bin") ||
    stat === "summary_bin" ||
    stat === "bindot"
  ) {
    const params = isRecord(layer["params"]) ? layer["params"] : {};
    const binStat =
      geom === "histogram" ||
      geom === "freqpoly" ||
      geom === "dotplot" ||
      stat === "bin" ||
      stat === "summary_bin" ||
      stat === "bindot";
    if (binStat && params["center"] !== undefined && params["boundary"] !== undefined) {
      errors.push({
        code: "bin-center-and-boundary",
        path: `${layerPath}/params`,
        message: `The ${stat === "summary_bin" ? "summary_bin" : "bin"} stat accepts params.center OR params.boundary (both align the bin grid), never both.`,
        fix: {
          description: "Keep one alignment parameter and remove the other.",
          example: { params: { binwidth: 1, boundary: 0 } },
        },
      });
    }
  }

  if (geom === "errorbar" || geom === "linerange" || geom === "pointrange" || geom === "crossbar") {
    const needed: ChannelName[] =
      stat === "summary" || stat === "summary_bin"
        ? ["y"]
        : geom === "pointrange" || geom === "crossbar"
          ? ["y", "ymin", "ymax"]
          : ["ymin", "ymax"];
    for (const channel of needed) {
      if (mapped(channel) === undefined) {
        errors.push({
          code: "missing-required-channel",
          path: `${layerPath}/aes/${channel}`,
          message: `The ${geom} geom with the ${stat} stat requires a "${channel}" channel; map it in the layer's aes or the plot-level aes.`,
          fix: {
            description: `Map "${channel}" to a data field.`,
            example: { [channel]: CHANNEL_FIX_EXAMPLE },
          },
        });
      }
    }
  }

  if (geom === "ribbon") {
    errors.push(...ribbonStructuralErrors(layer, layerPath, mapped));
  }

  if (stat === "manual") {
    const params = isRecord(layer["params"]) ? layer["params"] : {};
    const fun = params["fun"];
    // Unknown names are rejected by the schema enum as invalid-enum-value.
    if (fun === undefined || fun === null || fun === "") {
      errors.push({
        code: "manual-fun-required",
        path: `${layerPath}/params/fun`,
        message:
          "The manual stat requires params.fun (one of first|last|mean|median|min|max|sum). There is no silent identity default (ggplot2 divergence; #814).",
        fix: {
          description: "Set params.fun to a registered portable transform name.",
          example: { params: { fun: "mean" } },
        },
      });
    }
  }

  if (geom === "spoke") {
    const params = isRecord(layer["params"]) ? layer["params"] : {};
    for (const channel of ["angle", "radius"] as const) {
      const fromAes = mapped(channel);
      const fromParams = params[channel];
      if (fromAes === undefined && fromParams === undefined) {
        errors.push({
          code: "missing-required-channel",
          path: `${layerPath}/aes/${channel}`,
          message: `The spoke geom requires "${channel}" via aes.${channel} or params.${channel}.`,
          fix: {
            description: `Map aes.${channel} to a field, or set params.${channel} to a constant.`,
            example:
              channel === "angle"
                ? { geom: "spoke", params: { angle: 0, radius: 1 } }
                : { geom: "spoke", params: { radius: 1, angle: 0 } },
          },
        });
      }
      // Runtime only materializes field angle/radius (checkField); aes constants
      // would pass validation then throw in requireField — reject early. Prefer
      // params.angle / params.radius for constants (ggplot2-compatible).
      if (fromAes !== undefined && !("field" in fromAes) && fromParams === undefined) {
        errors.push({
          code: "missing-required-channel",
          path: `${layerPath}/aes/${channel}`,
          message: `The spoke geom requires aes.${channel} to map a data field (not a constant or stat). Use params.${channel} for a fixed value.`,
          fix: {
            description: `Map aes.${channel} to a field, or set params.${channel} to a constant.`,
            example:
              channel === "angle"
                ? { geom: "spoke", params: { angle: 0, radius: 1 } }
                : { geom: "spoke", params: { radius: 1, angle: 0 } },
          },
        });
      }
    }
  }

  if (geom === "rug") {
    const params = isRecord(layer["params"]) ? layer["params"] : {};
    const sides = typeof params["sides"] === "string" ? params["sides"] : "bl";
    if (/[bt]/.test(sides) && mapped("x") === undefined) {
      pushMissingChannel(
        errors,
        layerPath,
        "x",
        `The rug geom with sides "${sides}" requires an "x" channel for bottom/top ticks; map aes.x or narrow params.sides.`,
      );
    }
    if (/[lr]/.test(sides) && mapped("y") === undefined) {
      pushMissingChannel(
        errors,
        layerPath,
        "y",
        `The rug geom with sides "${sides}" requires a "y" channel for left/right ticks; map aes.y or narrow params.sides.`,
      );
    }
  }

  errors.push(...paintStructuralErrors(layer, layerPath, plotAes));

  for (const channel of REQUIRED_CHANNELS[geom as GeomName]) {
    if (
      (geom === "bar" ||
        geom === "histogram" ||
        geom === "freqpoly" ||
        geom === "density" ||
        geom === "dotplot" ||
        (geom === "line" && stat === "bin")) &&
      channel !== "x"
    ) {
      continue;
    }
    const value = mapped(channel);
    if (value === undefined) {
      errors.push({
        code: "missing-required-channel",
        path: `${layerPath}/aes/${channel}`,
        message: `The ${geom} geom requires a "${channel}" channel; map it in the layer's aes or the plot-level aes.`,
        fix: {
          description: `Map "${channel}" to a data field.`,
          example: { [channel]: CHANNEL_FIX_EXAMPLE },
        },
      });
      continue;
    }
    // Segment/curve runtime only materializes field endpoints (checkField);
    // constants/stat mappings would pass validation then throw in requireField.
    if (
      (geom === "segment" || geom === "curve") &&
      (channel === "x" || channel === "y" || channel === "xend" || channel === "yend") &&
      !("field" in value)
    ) {
      errors.push({
        code: "missing-required-channel",
        path: `${layerPath}/aes/${channel}`,
        message: `The ${geom} geom requires aes.${channel} to map a data field (not a constant or stat).`,
        fix: {
          description: `Map "${channel}" to a data field.`,
          example: { [channel]: CHANNEL_FIX_EXAMPLE },
        },
      });
    }
    // Spoke origin x/y are field-only in the pipeline (same requireField path).
    if (geom === "spoke" && (channel === "x" || channel === "y") && !("field" in value)) {
      errors.push({
        code: "missing-required-channel",
        path: `${layerPath}/aes/${channel}`,
        message: `The spoke geom requires aes.${channel} to map a data field (not a constant or stat).`,
        fix: {
          description: `Map "${channel}" to a data field.`,
          example: { [channel]: CHANNEL_FIX_EXAMPLE },
        },
      });
    }
  }
  return errors;
}
