/**
 * Pipeline public contract and shared internal frame types.
 * Split into types-public / types-frame; this module re-exports for path stability.
 */
export type {
  Advisory,
  AxisValueFormatter,
  LayerBackend,
  MappedField,
  NamedData,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  RunOptions,
  ScaleDecision,
  ScaleDiagnostic,
  ScaleDiagnosticFix,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./types-public.js";
export { CANVAS_AUTO_THRESHOLD, PipelineError } from "./types-public.js";

export type {
  BinPayload,
  BoxFrame,
  BoxPayload,
  ColorBinding,
  DodgePayload,
  FinalizedLayerFrame,
  LayerBinding,
  LayerFrame,
  LayerFrameCore,
  RuleForm,
  SmoothPayload,
  StyleBinding,
} from "./types-frame.js";
export { NO_ROW, colorOf } from "./types-frame.js";
