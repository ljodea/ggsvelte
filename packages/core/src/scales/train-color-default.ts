import { CATEGORICAL_PALETTE_10 } from "./categorical-palette-default.js";
import type { OrdinalColorConfig } from "./train-color.js";
import type { ScaleState, TrainResult } from "./state.js";
import { trainDiscrete } from "./state.js";
import type { ColorScale } from "./train-types.js";

/** Train default/explicit-range ordinal colors without loading named scheme catalogs. */
export function trainDefaultColor(
  values: Iterable<unknown>,
  prevState?: ScaleState | null,
  config: OrdinalColorConfig = {},
): ColorScale {
  const baseRange = config.range ?? CATEGORICAL_PALETTE_10;
  const range = config.reverse === true ? baseRange.toReversed() : baseRange;
  const scheme =
    config.range === undefined
      ? config.reverse === true
        ? "observable10-reversed"
        : "observable10"
      : undefined;
  const result: TrainResult = trainDiscrete(
    values,
    {
      type: "ordinal",
      range,
      ...(scheme !== undefined && { scheme }),
      ...(config.domain !== undefined && { domain: config.domain }),
      ...(config.domainMode !== undefined && { domainMode: config.domainMode }),
      ...(config.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    },
    prevState ?? null,
  );

  return {
    type: "ordinal",
    domain: result.domain,
    indexOf: (value: unknown) => result.indexOf(value),
    colorOf: (value: unknown) => result.rangeValueOf(value) as string | undefined,
    state: result.state,
    warnings: result.warnings,
  };
}
