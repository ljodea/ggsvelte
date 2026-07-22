/**
 * Value-stable categorical color scale (decision 0002 semantics): first-seen
 * assignment keyed by value; removing a series changes nothing else; a
 * returning series gets its old color back via `prevState`. Config wires the
 * spec surface through trainDiscrete: explicit domain = pinned mode
 * (suspends stored assignments), domainMode, scheme/range, onExhaust.
 */
import { VIRIDIS_RAMP_10 } from "./color.js";
import { CATEGORICAL_PALETTE_10, CATEGORICAL_SCHEMES } from "./categorical-palettes.js";
import type { ScaleState, TrainResult } from "./state.js";
import { trainDiscrete } from "./state.js";
import type { ColorScale } from "./train-types.js";

function rangeForScheme(scheme: string | undefined): readonly string[] | undefined {
  if (scheme === "viridis") return VIRIDIS_RAMP_10;
  if (scheme === undefined) return undefined;
  return CATEGORICAL_SCHEMES[scheme as keyof typeof CATEGORICAL_SCHEMES];
}

export interface OrdinalColorConfig {
  domain?: readonly unknown[];
  domainMode?: "grow" | "data";
  range?: readonly string[];
  scheme?: string;
  reverse?: boolean;
  onExhaust?: "cycle" | "error";
}

export function trainColor(
  values: Iterable<unknown>,
  prevState?: ScaleState | null,
  config: OrdinalColorConfig = {},
): ColorScale {
  const baseRange = config.range ?? rangeForScheme(config.scheme) ?? CATEGORICAL_PALETTE_10;
  const range = config.reverse === true ? baseRange.toReversed() : baseRange;
  const scheme =
    config.range === undefined
      ? config.reverse === true
        ? `${config.scheme ?? "observable10"}-reversed`
        : (config.scheme ?? "observable10")
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
