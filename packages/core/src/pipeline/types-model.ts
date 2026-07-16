/**
 * Pipeline model types: trained scales, domain snapshots, and RenderModel.
 */
import type { Scene } from "../scene.js";
import type { CellValue } from "../table.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import type { Advisory, PipelineWarning } from "./types-advisory.js";
import type {
  AxisValueFormatter,
  LayerBackend,
  MappedField,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./types-model-scales.js";

export type {
  AxisValueFormatter,
  LayerBackend,
  MappedField,
  ResolvedColorScale,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./types-model-scales.js";

export interface RenderModel {
  scene: Scene;
  scales: TrainedScales;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  /** Monotonic run identity (module-global, increases every runPipeline call). */
  runId: number;
  /**
   * Resolved rendering backend per layer: the layer's `render` hint, with
   * "auto" resolving to canvas above the mark-count threshold (advisory
   * `canvas-auto`), and `a11y: "force-svg"` forcing every layer to "svg".
   * renderToSVGString ignores this (always all-SVG).
   */
  layerBackends: LayerBackend[];
  /** Field-mapped channels per layer (drives default tooltip content). */
  layerFields: MappedField[][];
  /**
   * Scaled constant aes values per layer (`{ value, scale: true }` on color/fill).
   * Used by legend-focus key indexing when no field mapping exists for a scale.
   */
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  /** Stable baseline plus the domains actually used for this render. */
  domains: Readonly<{ baseline: ScaleDomainSnapshot; effective: ScaleDomainSnapshot }>;
  /** Interned source-row memberships. Public adapters resolve these through keys. */
  lineage: LineageStore<number>;
  /** Shared epoch-scoped interaction candidate storage. */
  candidates: CandidateStore;
  /** Trained semantic formatters. Coord transforms never swap x and y here. */
  axisFormatters: Readonly<{ x: AxisValueFormatter; y: AxisValueFormatter }>;
  /** The source data row behind a hit-index rowIndex (null for synthesized
   *  stat rows). Reads the bound table — do not call after dispose(). */
  row(index: number): Record<string, CellValue> | null;
  /**
   * Release this model's geometry and caches (plan: memory ownership). The
   * Svelte adapter disposes the previous model on commit and the current one
   * on unmount. After dispose() the scene's batches are empty and row()
   * returns null; rendering a disposed model is a caller bug.
   */
  dispose(): void;
}
