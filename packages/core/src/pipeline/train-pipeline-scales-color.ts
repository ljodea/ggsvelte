/**
 * Resolve global color and fill scales for a pipeline run.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import type { ColumnTable } from "../table.js";

import { resolveColorScale } from "./scale-training.js";
import type { Advisory, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export function trainPipelineColorScales(input: {
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  labs: NonNullable<PortableSpec["labs"]>;
  allFrames: readonly LayerFrame[];
  table: ColumnTable;
  options: Pick<RunOptions, "prevScales">;
  editionDefaults: EditionDefaults;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): {
  colorResolution: ReturnType<typeof resolveColorScale>;
  fillResolution: ReturnType<typeof resolveColorScale>;
} {
  const { scalesConfig, labs, allFrames, table, options, editionDefaults, warnings, advisories } =
    input;

  const firstColorField = allFrames.find((f) => f.binding.color.field !== null)?.binding.color
    .field;
  const firstFillField = allFrames.find((f) => f.binding.fill.field !== null)?.binding.fill.field;
  const colorResolution = resolveColorScale(
    "color",
    allFrames,
    table,
    scalesConfig.color,
    options.prevScales?.["color"] ?? null,
    labs.color ?? firstColorField ?? "",
    warnings,
    advisories,
    editionDefaults,
  );
  const fillResolution = resolveColorScale(
    "fill",
    allFrames,
    table,
    scalesConfig.fill,
    options.prevScales?.["fill"] ?? null,
    labs.fill ?? firstFillField ?? "",
    warnings,
    advisories,
    editionDefaults,
  );

  return { colorResolution, fillResolution };
}
