/**
 * Color/fill scale resolution (ordinal value-stable + sequential ramps).
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { LegendInput } from "../legend.js";
import { trainSequential, VIRIDIS_RAMP_10 } from "../scales/color.js";
import type { ScaleState } from "../scales/state.js";
import { PaletteExhaustedError } from "../scales/state.js";
import type { ColorScale } from "../scales/train.js";
import { CATEGORICAL_PALETTE_10, finiteExtent, trainColor } from "../scales/train.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import { numberFormatter } from "../layout/format.js";
import type { CellValue } from "../table.js";
import { cellsToNumeric, cellToNumber, ColumnTable } from "../table.js";
import type { EditionDefaults } from "../editions.js";

import type { Advisory, LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { PipelineError } from "./types.js";

// ---------------------------------------------------------------------------
// Color / fill scale resolution
// ---------------------------------------------------------------------------

interface ColorResolution {
  resolved: ResolvedColorScale | null;
  legendInput: LegendInput | null;
  state: ScaleState | null;
}

export function resolveColorScale(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  table: ColumnTable,
  config: ColorScaleSpec | undefined,
  prevState: ScaleState | null,
  legendTitle: string,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  editionDefaults: EditionDefaults,
): ColorResolution {
  const values: CellValue[] = [];
  let anyDiscreteField = false;
  let anyField = false;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (channel.field !== null && frameValues !== null) {
      anyField = true;
      if (table.has(channel.field) && table.discreteness(channel.field) === "discrete") {
        anyDiscreteField = true;
      }
      for (const v of frameValues) values.push(v);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      values.push(channel.scaledConstant);
    }
  }
  if (!anyField) return { resolved: null, legendInput: null, state: null };

  const type = config?.type ?? (anyDiscreteField ? "ordinal" : "sequential");

  if (type === "sequential") {
    if (anyDiscreteField) {
      warnings.push({
        code: "sequential-discrete-field",
        message: `The ${name} scale is sequential but a mapped field is discrete; values that do not parse as numbers render the unknown color.`,
      });
    }
    const numeric = cellsToNumeric(values);
    const extent = finiteExtent([numeric]);
    const domain = config?.domain;
    const sequentialDomain =
      domain !== undefined && domain.length === 2
        ? ([cellToNumber(domain[0] as CellValue), cellToNumber(domain[1] as CellValue)] as [
            number,
            number,
          ])
        : undefined;
    // Edition-keyed default ramp: identical to the trainSequential built-in
    // for edition 1 (pass nothing — keeps behavior byte-stable); a different
    // edition's ramp is passed explicitly. Explicit config always wins.
    const editionRamp =
      editionDefaults.sequentialRamp === VIRIDIS_RAMP_10
        ? undefined
        : editionDefaults.sequentialRamp;
    const range = config?.range ?? editionRamp;
    const scale = trainSequential(extent, {
      ...(sequentialDomain !== undefined && { domain: sequentialDomain }),
      ...(range !== undefined && { range }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
    });
    if (config?.scheme === undefined && config?.range === undefined) {
      advisories.push({
        code: "palette-inferred",
        path: `scales.${name}`,
        chosen: "sequential viridis ramp",
        howToOverride: `Set scales.${name}.range (ramp stops) or scales.${name}.domain.`,
      });
    }
    const labelFormat = config?.labels;
    let format = defaultTickFormat(tickStep(scale.domain[0], scale.domain[1], 5));
    if (labelFormat !== undefined) {
      const f = numberFormatter(labelFormat);
      if (f.ok) {
        format = (v: number) => f.format(v);
      } else {
        warnings.push({
          code: "invalid-label-format",
          message: `Unrecognized labels format "${labelFormat}" on scales.${name}; using the default.`,
        });
      }
    }
    return {
      resolved: { kind: "sequential", scale },
      legendInput: {
        kind: "ramp",
        scale: name,
        title: legendTitle,
        domain: scale.domain,
        at: (t: number) => scale.at(t),
        format,
      },
      state: null,
    };
  }

  // --- ordinal (value-stable) --------------------------------------------------
  const scheme = config?.scheme;
  // Edition-keyed default palette: for edition 1 nothing is passed (trainColor
  // keeps its "observable10" scheme fingerprint — byte-stable with pre-edition
  // state); other editions pass their palette as an explicit range.
  const editionPalette =
    editionDefaults.categoricalPalette === CATEGORICAL_PALETTE_10
      ? undefined
      : editionDefaults.categoricalPalette;
  // A named scheme resolves inside trainColor. Edition defaults only apply
  // when the caller supplied neither a scheme nor an explicit range.
  const range = config?.range ?? (scheme === undefined ? editionPalette : undefined);
  let scale: ColorScale;
  try {
    scale = trainColor(values, prevState, {
      ...(config?.domain !== undefined && { domain: config.domain }),
      ...(config?.domainMode !== undefined && { domainMode: config.domainMode }),
      ...(range !== undefined && { range }),
      ...(scheme !== undefined && { scheme }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
      ...(config?.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    });
  } catch (error) {
    if (error instanceof PaletteExhaustedError) {
      throw new PipelineError("palette-exhausted", `/scales/${name}`, error.message);
    }
    throw error;
  }
  for (const w of scale.warnings) warnings.push({ code: w.code, message: w.message });
  if (config?.scheme === undefined && config?.range === undefined) {
    advisories.push({
      code: "palette-inferred",
      path: `scales.${name}`,
      chosen: "categorical 10-color palette (value-stable assignment)",
      howToOverride: `Set scales.${name}.scheme, scales.${name}.range, or scales.${name}.domain.`,
    });
  }
  return {
    resolved: { kind: "ordinal", scale },
    legendInput: {
      kind: "discrete",
      scale: name,
      title: legendTitle,
      domain: scale.domain,
      firstSeen: values,
      colorOf: (v: unknown) => scale.colorOf(v),
    },
    state: scale.state,
  };
}
