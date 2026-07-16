/**
 * Pipeline public contract: errors, model, run options, scale snapshots.
 * Split into types-advisory / types-model / types-options; re-exported here
 * for import-path stability.
 */
export type { Advisory, PipelineWarning } from "./types-advisory.js";
export { CANVAS_AUTO_THRESHOLD, PipelineError } from "./types-advisory.js";

export type {
  AxisValueFormatter,
  LayerBackend,
  MappedField,
  RenderModel,
  ResolvedColorScale,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./types-model.js";

export type { NamedData, RunOptions } from "./types-options.js";
