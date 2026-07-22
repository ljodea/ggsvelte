/**
 * Data-free structural grammar checks for layers (required channels, rule forms,
 * computed-y bans, bin center/boundary, errorbar stat channels).
 * Color-scheme rules: validate-structure-scales.ts. Facet form: validate-structure-facet.ts.
 * Barrel: validate-structure.ts.
 */
import type { SpecError } from "./errors.js";
import type { Aes, ChannelName } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema.js";
import { effectiveChannel } from "./validate-data.js";

const CHANNEL_FIX_EXAMPLE = { field: "column_name" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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
