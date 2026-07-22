/** Semantic numeric view for sequential/binned color and fill scales. */
import {
  parseTemporal,
  parseTemporalColumn,
  type ColorScaleSpec,
  type TemporalKind,
  type TemporalParserSpec,
} from "@ggsvelte/spec";

import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import { PipelineError, type PipelineWarning } from "./types.js";

export interface ColorValueView {
  semantic: Float64Array;
  temporalKind: TemporalKind | null;
  parser: TemporalParserSpec | null;
  semanticOf(value: unknown): number | undefined;
}

function colorScaleError(
  name: "color" | "fill",
  code: string,
  problem: string,
  cause: string,
  fixes: readonly { description: string }[],
): PipelineError {
  const path = `/scales/${name}`;
  return new PipelineError(code, path, cause, {
    code,
    severity: "error",
    path,
    problem,
    cause,
    fixes,
    documentationUrl: `/guide/color-scales#${code}`,
  });
}

export function resolveColorValueView(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec | undefined;
  warnings: PipelineWarning[];
}): ColorValueView {
  const { name, values, config, warnings } = input;
  const requestsTemporal =
    config?.temporalKind !== undefined ||
    config?.parse !== undefined ||
    config?.timezone !== undefined ||
    config?.disambiguation !== undefined;
  const options = {
    ...(config?.timezone !== undefined && { timezone: config.timezone }),
    ...(config?.disambiguation !== undefined && { disambiguation: config.disambiguation }),
  };
  const parsed = parseTemporalColumn(values, config?.parse ?? "auto", options);
  const temporal = parsed.decision.status === "temporal";

  if (requestsTemporal && !temporal) {
    const cause =
      parsed.decision.status === "ambiguous"
        ? `Temporal ${name} values are ambiguous between ${parsed.decision.candidates.join(", ")}.`
        : `Temporal ${name} parsing rejected ${String(parsed.decision.failedCount)} value(s).`;
    if (config?.parseFailure !== "censor") {
      throw colorScaleError(
        name,
        "color-temporal-parse",
        `The ${name} scale requested temporal values but the complete column did not parse.`,
        cause,
        [
          { description: `Set scales.${name}.parse to the exact source order.` },
          {
            description:
              'Use parseFailure: "censor" only when dropping invalid colors is intended.',
          },
        ],
      );
    }
    warnings.push({ code: "color-temporal-censored", message: cause });
  }

  if (
    temporal &&
    config?.temporalKind !== undefined &&
    parsed.decision.kind !== config.temporalKind
  ) {
    throw colorScaleError(
      name,
      "color-temporal-kind",
      `The ${name} scale requested ${config.temporalKind} values.`,
      `The parsed column has ${parsed.decision.kind ?? "unknown"} precision.`,
      [
        {
          description: `Use the ${parsed.decision.kind ?? "matching"} helper or correct the source.`,
        },
      ],
    );
  }

  if (temporal || requestsTemporal) {
    const parser =
      config?.parse ??
      (parsed.decision.parser === null ? null : (parsed.decision.parser as TemporalParserSpec));
    const byKey = new Map<string, number>();
    for (let index = 0; index < values.length; index++) {
      if (parsed.valid[index] !== 1) continue;
      byKey.set(encodeKey(values[index]), parsed.semantic[index]!);
    }
    return {
      semantic: parsed.semantic,
      temporalKind: parsed.decision.kind ?? config?.temporalKind ?? null,
      parser,
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

  const semantic = new Float64Array(values.length);
  for (let index = 0; index < values.length; index++) {
    semantic[index] = cellToNumber(values[index]!);
  }
  return {
    semantic,
    temporalKind: null,
    parser: null,
    semanticOf(value: unknown): number | undefined {
      const number = cellToNumber(value as CellValue);
      return Number.isFinite(number) ? number : undefined;
    },
  };
}
