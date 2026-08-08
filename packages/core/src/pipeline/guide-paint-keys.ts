/**
 * Attach constant point-mark shapes to discrete color/fill legend keys.
 *
 * Paint scales train colour only. Layer params like `shape: "cross"` (and the
 * default circle for point-family geoms) live on the mark, so without this
 * step every color key falls through to a filled square — indistinguishable
 * for colorblind readers when two layers share one color scale with different
 * shapes (Snow cholera: grey deaths as circles, red pumps as crosses).
 *
 * When shape is a mapped aesthetic, leave the key alone so the shape-scale
 * merge path in prepareLegendInputs can supply it. Area/bar/line geoms stay
 * on square/line defaults (not shape-capable).
 */
import { POINT_SHAPE_NAMES } from "@ggsvelte/spec";

import type { DiscreteLegendInput } from "../legend.js";
import type { PointShape } from "../scales/style.js";
import { encodeKey } from "../scales/state.js";

import type { LayerBinding } from "./types.js";

type LegendKeyStyle = ReturnType<NonNullable<DiscreteLegendInput["keyOf"]>>;

const POINT_SHAPE_SET = new Set<string>(POINT_SHAPE_NAMES);
/**
 * Geoms that always emit point marks (PointsBatch). Not the same as
 * STYLE_AESTHETIC_GEOMS.shape, which lists geoms that *accept* a shape aesthetic
 * (includes `sf` for points only, and `blank` which draws nothing). Choropleth
 * sf / map layers must keep square paint keys.
 */
const POINT_MARK_GEOMS = new Set<string>([
  "point",
  "jitter",
  "count",
  "dotplot",
  "qq",
  "pointrange",
]);

function isPaintScale(scale: string): scale is "color" | "fill" {
  return scale === "color" || scale === "fill";
}

function layerMapsPaint(binding: LayerBinding, aesthetic: "color" | "fill"): boolean {
  const channel = binding[aesthetic];
  return (
    channel.scaledConstant !== null ||
    channel.field !== null ||
    (channel.statColumn !== null && channel.statColumn !== undefined)
  );
}

/** True when this layer can produce the domain value for the paint aesthetic. */
function layerContributesPaintValue(
  binding: LayerBinding,
  aesthetic: "color" | "fill",
  value: unknown,
): boolean {
  const channel = binding[aesthetic];
  if (channel.scaledConstant !== null) {
    try {
      return encodeKey(channel.scaledConstant) === encodeKey(value);
    } catch {
      return false;
    }
  }
  // Field/stat mappings may emit any trained domain value; without the frame
  // we cannot filter per-value, so the layer's constant mark style applies to
  // every key (correct for the common single-layer colored-points case).
  if (channel.field !== null || (channel.statColumn !== null && channel.statColumn !== undefined)) {
    return true;
  }
  return false;
}

/**
 * Constant shape for a shape-capable geom: aes constant, geom param, or the
 * plot default circle. Mapped shape (field/stat) returns undefined so the
 * shape scale can own the key.
 */
function layerConstantShape(binding: LayerBinding): PointShape | undefined {
  if (!POINT_MARK_GEOMS.has(binding.layer.geom)) return undefined;
  if (binding.shape.field !== null || binding.shape.statColumn !== null) return undefined;
  if (typeof binding.shape.constant === "string" && POINT_SHAPE_SET.has(binding.shape.constant)) {
    return binding.shape.constant as PointShape;
  }
  const params = binding.layer.params as { shape?: unknown } | undefined;
  if (typeof params?.shape === "string" && POINT_SHAPE_SET.has(params.shape)) {
    return params.shape as PointShape;
  }
  return "circle";
}

/**
 * Enrich a discrete color/fill legend so each domain value carries the
 * constant point shape of the layer(s) that paint it. No-op when no
 * shape-capable layer maps the aesthetic, or when shapes conflict for a value.
 */
export function enrichPaintLegendKeys(
  input: DiscreteLegendInput,
  bindings: readonly LayerBinding[],
): DiscreteLegendInput {
  if (!isPaintScale(input.scale)) return input;
  const aesthetic = input.scale;
  const relevant = bindings.filter((binding) => layerMapsPaint(binding, aesthetic));
  if (relevant.length === 0) return input;

  const shapeByKey = new Map<string, PointShape>();
  for (const value of input.domain) {
    let agreed: PointShape | undefined;
    let seen = false;
    let conflict = false;
    for (const binding of relevant) {
      if (!layerContributesPaintValue(binding, aesthetic, value)) continue;
      const shape = layerConstantShape(binding);
      if (shape === undefined) continue;
      if (!seen) {
        agreed = shape;
        seen = true;
      } else if (agreed !== shape) {
        conflict = true;
        break;
      }
    }
    if (!seen || conflict || agreed === undefined) continue;
    try {
      shapeByKey.set(encodeKey(value), agreed);
    } catch {
      // Non-encodable domain values cannot key a legend entry.
    }
  }
  if (shapeByKey.size === 0) return input;

  // Capture as a free function so oxlint unbound-method does not flag the
  // method reference when we call it from the enriched keyOf.
  const previousKeyOf = (value: unknown) => input.keyOf?.(value);
  return {
    ...input,
    keyOf(value: unknown): LegendKeyStyle {
      const key: LegendKeyStyle = { ...previousKeyOf(value) };
      // Preserve a shape already supplied by a merged shape scale.
      if (key.shape !== undefined) return key;
      try {
        const shape = shapeByKey.get(encodeKey(value));
        if (shape !== undefined) key.shape = shape;
      } catch {
        // leave key without shape
      }
      return key;
    },
  };
}
