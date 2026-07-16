import type { PositionScale } from "@ggsvelte/core";

import type {
  BoundsAction,
  BoundsAxis,
  BoundsCategoryValue,
  BoundsEditorInput,
  BoundsScale,
} from "./bounds-editor.js";
import type { SemanticIntervalAxis } from "./interaction.js";

export interface BoundsEditorInputForScaleOptions {
  readonly axis: BoundsAxis;
  readonly action: BoundsAction;
  readonly scale: PositionScale;
  readonly bounds?: readonly [number, number];
  readonly reversed?: boolean;
}

export function boundsEditorInputForScale(
  options: BoundsEditorInputForScaleOptions,
): BoundsEditorInput {
  const { scale } = options;
  if (scale.type === "band") {
    const categories = scale.domain.map((value) => ({ value, label: value }));
    return {
      axis: options.axis,
      action: options.action,
      scale: "band",
      bounds: [scale.domain[0] ?? "", scale.domain.at(-1) ?? ""],
      categories,
      reversed: options.reversed ?? false,
    };
  }
  const requested = options.bounds ?? scale.domain;
  const bounds =
    requested[0] <= requested[1]
      ? ([requested[0], requested[1]] as const)
      : ([requested[1], requested[0]] as const);
  return {
    axis: options.axis,
    action: options.action,
    scale: scale.type,
    bounds,
    reversed: options.reversed ?? false,
  };
}

export function semanticAxisFromBounds(
  scale: BoundsScale,
  bounds: readonly [number, number] | readonly [BoundsCategoryValue, BoundsCategoryValue],
): SemanticIntervalAxis {
  if (scale === "band") {
    return Object.freeze({
      kind: "band",
      values: Object.freeze(bounds.map(String)),
    });
  }
  const first = bounds[0] as number;
  const second = bounds[1] as number;
  return Object.freeze({
    kind: scale,
    domain: Object.freeze(first <= second ? [first, second] : [second, first]),
  });
}
