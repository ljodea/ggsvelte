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

import {
  buildRenderModelAxisFormatters,
  buildRenderModelScales,
} from "./assemble-render-model-scales.js";
import { createRenderModelLifecycle } from "./assemble-render-model-lifecycle.js";
import type {
  Advisory,
  LayerBackend,
  MappedField,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  ScaleDomainSnapshot,
} from "./types.js";
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
  const { scene, candidates } = input;
  const lifecycle = createRenderModelLifecycle({
    scene,
    candidates,
    table: input.table,
  });

  return {
    scene,
    scales: buildRenderModelScales(input),
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
    axisFormatters: buildRenderModelAxisFormatters(
      input.xScale,
      input.yScale,
      input.formatX,
      input.formatY,
    ),
    row: lifecycle.row,
    dispose: lifecycle.dispose,
  };
}
