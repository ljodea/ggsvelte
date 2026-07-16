/**
 * Assemble the public RenderModel (scene, scales, contracts, dispose/row).
 */
import type { TickFormatter } from "../layout/layout.js";
import type { ScaleState } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";
import type { Scene } from "../scene.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import { makeAxisValueFormatter } from "./layout-helpers.js";
import type {
  Advisory,
  LayerBackend,
  MappedField,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  ScaleDomainSnapshot,
} from "./types.js";
import { NO_ROW } from "./types.js";
import { dedupeAdvisories, dedupeWarnings } from "./layout-helpers.js";

export function assembleRenderModel(input: {
  scene: Scene;
  xScale: PositionScale;
  yScale: PositionScale;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorState: ScaleState | null;
  fillState: ScaleState | null;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  runId: number;
  layerBackends: LayerBackend[];
  layerFields: MappedField[][];
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  baselineDomains: ScaleDomainSnapshot;
  effectiveDomains: ScaleDomainSnapshot;
  lineage: LineageStore<number>;
  candidates: CandidateStore;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  table: ColumnTable;
}): RenderModel {
  const state: Record<string, ScaleState> = {};
  if (input.colorState !== null) state["color"] = input.colorState;
  if (input.fillState !== null) state["fill"] = input.fillState;

  let disposed = false;
  let retainedTable: ColumnTable | null = input.table;
  const { scene, candidates } = input;

  return {
    scene,
    scales: {
      x: input.xScale,
      y: input.yScale,
      color: input.color,
      fill: input.fill,
      panels: input.panelScales,
      state,
    },
    warnings: dedupeWarnings(input.warnings),
    advisories: dedupeAdvisories(input.advisories),
    runId: input.runId,
    layerBackends: input.layerBackends,
    layerFields: input.layerFields,
    layerScaledConstants: input.layerScaledConstants,
    domains: Object.freeze({
      baseline: input.baselineDomains,
      effective: input.effectiveDomains,
    }),
    lineage: input.lineage,
    candidates,
    axisFormatters: Object.freeze({
      x: makeAxisValueFormatter(input.xScale, input.formatX),
      y: makeAxisValueFormatter(input.yScale, input.formatY),
    }),
    row(index: number): Record<string, CellValue> | null {
      const source = retainedTable;
      if (source === null || index === NO_ROW || index < 0 || index >= source.rowCount) return null;
      const out: Record<string, CellValue> = {};
      for (const field of source.fields) out[field] = source.column(field)[index]!;
      return out;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      candidates.dispose();
      retainedTable = null;
      // Release geometry (typed arrays) and per-panel structures; the bound
      // table and its numeric caches become unreachable with this model.
      scene.batches.length = 0;
      scene.panels.length = 0;
      scene.legends.length = 0;
    },
  };
}
