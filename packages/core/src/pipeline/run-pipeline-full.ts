/**
 * runPipeline that injects the full named-theme catalog.
 * Does not import the slim table (that would keep the catalog-free table
 * on the GGPlot / @ggsvelte/core graph).
 */
import type { PortableSpec, SpecInput } from "@ggsvelte/spec";

import { EDITION_DEFAULTS } from "../editions.js";
import { perfMark, perfMeasure } from "../perf.js";

import { finalize } from "./finalize.js";
import { preparePipelineRun } from "./prepare-run.js";
import type { RenderModel, RunOptions } from "./types.js";

export function runPipeline(spec: SpecInput | PortableSpec, options: RunOptions): RenderModel {
  perfMark("ggsvelte:pipeline:start");
  const model = finalize(
    preparePipelineRun(spec, {
      ...options,
      editions: options.editions ?? EDITION_DEFAULTS,
    }),
  );
  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");
  return model;
}
