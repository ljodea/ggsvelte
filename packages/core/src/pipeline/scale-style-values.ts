/** Semantic numeric view for size/linewidth/alpha sequential and binned scales. */
import {
  parseTemporal,
  parseTemporalColumn,
  type StyleAesthetic,
  type TemporalKind,
  type TemporalParserSpec,
} from "@ggsvelte/spec";

import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import { PipelineError, type PipelineWarning } from "./types.js";

export interface NumericStyleConfig {
  type?: "ordinal" | "sequential" | "binned" | "manual" | "identity";
  temporalKind?: "date" | "datetime";
  parse?: TemporalParserSpec;
  parseFailure?: "error" | "censor";
  timezone?: string;
  disambiguation?: "compatible" | "earlier" | "later" | "reject";
  domain?: readonly CellValue[];
  breaks?: readonly (number | string)[];
  range?: readonly number[];
  domainMode?: "grow" | "data";
  reverse?: boolean;
  oob?: "censor" | "squish";
  naValue?: number;
  unknownValue?: number;
  onExhaust?: "cycle" | "error";
  labels?: string;
}

export interface NumericStyleValueView {
  semantic: Float64Array;
  temporalKind: TemporalKind | null;
  semanticOf(value: unknown): number | undefined;
}

export function resolveNumericStyleValueView(input: {
  aesthetic: Extract<StyleAesthetic, "size" | "linewidth" | "alpha">;
  values: readonly CellValue[];
  config: NumericStyleConfig | undefined;
  warnings: PipelineWarning[];
}): NumericStyleValueView {
  const { aesthetic, values, config, warnings } = input;
  const requestsTemporal =
    config?.temporalKind !== undefined ||
    config?.parse !== undefined ||
    config?.timezone !== undefined ||
    config?.disambiguation !== undefined;
  if (!requestsTemporal) {
    const semantic = Float64Array.from(values, (value) => cellToNumber(value));
    return {
      semantic,
      temporalKind: null,
      semanticOf(value: unknown) {
        const number = cellToNumber(value as CellValue);
        return Number.isFinite(number) ? number : undefined;
      },
    };
  }

  const options = {
    ...(config?.timezone !== undefined && { timezone: config.timezone }),
    ...(config?.disambiguation !== undefined && { disambiguation: config.disambiguation }),
  };
  // A runtime filter can empty `values` while an authored temporal domain or
  // binned breaks still fully determine the scale (e.g. size: { temporalKind:
  // "date", domain: [...] } or { type: "binned", breaks: [...] }). With no
  // samples, auto detection reports non-temporal and explicit parsers report
  // kind: null, so the checks below would throw before numericSequentialResolution()
  // ever parses the authored boundaries. Seed the temporal decision from the
  // authored domain — or, failing that, authored *binned* breaks — when no
  // samples remain, mirroring the color path returning a usable view for a fully
  // filtered temporal frame. Only binned breaks are bin boundaries that train the
  // domain; sequential breaks are guide-tick positions, so seeding from them would
  // let arbitrary tick choices invent a domain (numericSequentialResolution treats
  // `view.semantic` as the extent). Restrict the breaks fallback to `type: "binned"`.
  const temporalColumn =
    values.length === 0
      ? (config?.domain ?? (config?.type === "binned" ? config?.breaks : undefined) ?? values)
      : values;
  const parsed = parseTemporalColumn(temporalColumn, config?.parse ?? "auto", options);
  if (parsed.decision.status !== "temporal") {
    const cause =
      parsed.decision.status === "ambiguous"
        ? `Values are ambiguous between ${parsed.decision.candidates.join(", ")}.`
        : `${String(parsed.decision.failedCount)} value(s) failed temporal parsing.`;
    if (config?.parseFailure !== "censor") {
      throw new PipelineError(
        "style-temporal-parse",
        `/scales/${aesthetic}`,
        `The ${aesthetic} scale requested temporal values. ${cause}`,
      );
    }
    warnings.push({ code: "style-temporal-censored", message: `${aesthetic}: ${cause}` });
  }
  if (
    parsed.decision.status === "temporal" &&
    config?.temporalKind !== undefined &&
    parsed.decision.kind !== null &&
    parsed.decision.kind !== undefined &&
    parsed.decision.kind !== config.temporalKind
  ) {
    throw new PipelineError(
      "style-temporal-kind",
      `/scales/${aesthetic}/temporalKind`,
      `The ${aesthetic} scale requested ${config.temporalKind} but parsed ${parsed.decision.kind}.`,
    );
  }
  const parser =
    config?.parse ??
    (parsed.decision.parser === null ? null : (parsed.decision.parser as TemporalParserSpec));
  const byKey = new Map<string, number>();
  for (let index = 0; index < temporalColumn.length; index++) {
    if (parsed.valid[index] === 1)
      byKey.set(encodeKey(temporalColumn[index]), parsed.semantic[index]!);
  }
  return {
    semantic: parsed.semantic,
    temporalKind: parsed.decision.kind ?? config?.temporalKind ?? null,
    semanticOf(value: unknown): number | undefined {
      if (value === null || value === undefined) return undefined;
      try {
        const cached = byKey.get(encodeKey(value));
        if (cached !== undefined) return cached;
      } catch {
        return undefined;
      }
      if (parser === null) return undefined;
      const result = parseTemporal(value, parser, options);
      return result.ok ? result.epochMs : undefined;
    },
  };
}
