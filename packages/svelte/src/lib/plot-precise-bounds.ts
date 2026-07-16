import { encodeKey, type PositionScale } from "@ggsvelte/core";

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
  readonly bounds?: readonly [number, number] | readonly [BoundsCategoryValue, BoundsCategoryValue];
  readonly reversed?: boolean;
}

export function boundsEditorInputForScale(
  options: BoundsEditorInputForScaleOptions,
): BoundsEditorInput {
  const { scale } = options;
  if (scale.type === "band") {
    const categories = scale.rawDomain.map((value, index) => ({
      value: value as BoundsCategoryValue,
      label: scale.domain[index] ?? String(value),
    }));
    const requested = options.bounds;
    const categoryValue = (bound: BoundsCategoryValue): BoundsCategoryValue => {
      if (typeof bound === "string") {
        const typed = categories.find((category) => encodeKey(category.value) === bound);
        if (typed !== undefined) return typed.value;
      }
      return categories.find((category) => Object.is(category.value, bound))?.value ?? bound;
    };
    const bounds =
      requested === undefined
        ? ([categories[0]?.value ?? "", categories.at(-1)?.value ?? ""] as const)
        : ([categoryValue(requested[0]), categoryValue(requested[1])] as const);
    return {
      axis: options.axis,
      action: options.action,
      scale: "band",
      bounds,
      categories,
      reversed: options.reversed ?? false,
    };
  }
  const requested = (options.bounds as readonly [number, number] | undefined) ?? scale.domain;
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
      values: Object.freeze(bounds.map((bound) => encodeKey(bound))),
    });
  }
  const first = bounds[0] as number;
  const second = bounds[1] as number;
  const domain: readonly [number, number] = Object.freeze(
    first <= second ? [first, second] : [second, first],
  );
  return Object.freeze({
    kind: scale,
    domain,
  });
}
