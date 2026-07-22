/**
 * Data-free structural grammar checks for layers (required channels, rule forms,
 * computed-y bans, bin center/boundary, errorbar stat channels).
 * Color-scheme rules: validate-structure-scales.ts. Facet form: validate-structure-facet.ts.
 * Barrel: validate-structure.ts.
 */
import type { SpecError } from "./errors.js";
import type { Aes, ChannelName } from "./schema.js";
import { GEOM_DEFAULTS } from "./schema.js";
import { STYLE_AESTHETIC_GEOMS, type StyleAesthetic } from "./capabilities.js";
import { effectiveChannel } from "./validate-data.js";
import { paintStructuralErrors } from "./validate-structure-paint.js";

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
  rect: ["xmin", "xmax", "ymin", "ymax"],
  segment: ["x", "y", "xend", "yend"],
  tile: ["x", "y"],
  raster: ["x", "y"],
  ribbon: [], // orientation-dependent; checked separately
};

function hasIntercepts(layer: Record<string, unknown>): boolean {
  const params = layer["params"];
  if (!isRecord(params)) return false;
  return params["xintercept"] !== undefined || params["yintercept"] !== undefined;
}

function pushMissingChannel(
  errors: SpecError[],
  layerPath: string,
  channel: ChannelName,
  message: string,
): void {
  errors.push({
    code: "missing-required-channel",
    path: `${layerPath}/aes/${channel}`,
    message,
    fix: {
      description: `Map "${channel}" to a data field.`,
      example: { [channel]: CHANNEL_FIX_EXAMPLE },
    },
  });
}

function ribbonStructuralErrors(
  layer: Record<string, unknown>,
  layerPath: string,
  mapped: (channel: ChannelName) => unknown,
): SpecError[] {
  const errors: SpecError[] = [];
  const params = isRecord(layer["params"]) ? layer["params"] : {};
  const pinned =
    params["orientation"] === "x" || params["orientation"] === "y" ? params["orientation"] : null;
  const xContract =
    mapped("x") !== undefined && mapped("ymin") !== undefined && mapped("ymax") !== undefined;
  const yContract =
    mapped("y") !== undefined && mapped("xmin") !== undefined && mapped("xmax") !== undefined;

  if (pinned === null && xContract && yContract) {
    errors.push({
      code: "ribbon-orientation-ambiguous",
      path: `${layerPath}/params/orientation`,
      message:
        'This ribbon layer maps both x-orientation (x+ymin+ymax) and y-orientation (y+xmin+xmax) contracts. Set params.orientation to "x" or "y".',
      fix: {
        description: "Pin orientation explicitly.",
        example: { params: { orientation: "x" } },
      },
    });
    return errors;
  }

  const orientation: "x" | "y" | null =
    pinned === "x" || pinned === "y" ? pinned : xContract ? "x" : yContract ? "y" : null;

  const needed: ChannelName[] =
    orientation === "y" ||
    (orientation === null &&
      (mapped("y") !== undefined || mapped("xmin") !== undefined || mapped("xmax") !== undefined))
      ? ["y", "xmin", "xmax"]
      : orientation === "x" || orientation === null
        ? ["x", "ymin", "ymax"]
        : ["x", "ymin", "ymax"];

  for (const channel of needed) {
    if (mapped(channel) !== undefined) continue;
    const suffix =
      orientation === null ? "for its interval contract" : `with orientation "${orientation}"`;
    pushMissingChannel(
      errors,
      layerPath,
      channel,
      `The ribbon geom ${suffix} requires a "${channel}" channel; map it in the layer's aes or the plot-level aes.`,
    );
  }
  return errors;
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
  // Annotation-form rules (fixed intercepts) inherit NO plot aes — normalize
  // drops it — so a plot-level style meant for other layers must not trip the
  // geom-capability check here. Match the rule-form x/y handling below by
  // consulting only the rule's OWN aes for these layers.
  const annotationRule = geom === "rule" && hasIntercepts(layer);

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

  if (geom === "ribbon") {
    errors.push(...ribbonStructuralErrors(layer, layerPath, mapped));
  }

  errors.push(...paintStructuralErrors(layer, layerPath, plotAes));

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
