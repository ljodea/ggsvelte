/**
 * Fold non-mark grammar layers onto the fluent builder (#785).
 * Pure module: no Svelte runes. Safe for assemble.ts.
 */
import { gg } from "@ggsvelte/spec";

import { GRAMMAR_FAMILIES } from "./grammar-families.js";
import type { GrammarLayerKind, PlotLayerLike } from "./types.js";

type GgBuilder = ReturnType<typeof gg>;

/**
 * Apply one plot layer onto the fluent builder.
 * Marks are ignored (they travel through `input.layers` / `toLayerInput`).
 */
export function foldPlotLayer(builder: GgBuilder, layer: PlotLayerLike): GgBuilder {
  if (layer.kind === "mark") {
    return builder;
  }
  const family = GRAMMAR_FAMILIES[layer.kind as GrammarLayerKind];
  if (family === undefined) {
    const unhandled: never = layer as never;
    throw new TypeError(`Unhandled plot layer kind: ${String(unhandled)}`);
  }
  // Per-kind value types are checked by Layer / PlotLayerLike; one cast at the
  // fold boundary keeps the table free of builder imports.
  switch (family.builderMethod) {
    case "scales":
      return builder.scales(layer.value as Parameters<GgBuilder["scales"]>[0]);
    case "theme":
      return builder.theme(layer.value as Parameters<GgBuilder["theme"]>[0]);
    case "coord":
      return builder.coord(layer.value as Parameters<GgBuilder["coord"]>[0]);
    case "facet":
      return builder.facet(layer.value as Parameters<GgBuilder["facet"]>[0]);
    case "labs":
      return builder.labs(layer.value as Parameters<GgBuilder["labs"]>[0]);
    case "guides":
      return builder.guides(layer.value as Parameters<GgBuilder["guides"]>[0]);
    case "legend":
      return builder.legend(layer.value as Parameters<GgBuilder["legend"]>[0]);
    default: {
      const unhandled: never = family.builderMethod;
      throw new TypeError(`Unhandled builder method: ${String(unhandled)}`);
    }
  }
}

/** Fold plot layers in registration order (children win over earlier siblings). */
export function foldPlotLayers(builder: GgBuilder, layers: readonly PlotLayerLike[]): GgBuilder {
  let next = builder;
  for (const layer of layers) {
    next = foldPlotLayer(next, layer);
  }
  return next;
}
