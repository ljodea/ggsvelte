/**
 * Pack trained scales + contracts into assembleRenderModel input.
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import type { Scene } from "../scene.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import { assembleRenderModel } from "./assemble-render-model.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type {
  Advisory,
  LayerBackend,
  MappedField,
  PipelineWarning,
  RenderModel,
  ScaleDomainSnapshot,
} from "./types.js";
import type { CellValue } from "../table.js";

export function assembleFinalizeRenderModel(input: {
  scene: Scene;
  trained: TrainedPipelineScales;
  prepared: PreparedPanels;
  panelLayout: PanelLayoutResult;
  coordProjectors: readonly PanelCoordProjector[];
  flipped: boolean;
  runId: number;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  layerBackends: LayerBackend[];
  layerFields: MappedField[][];
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  baselineDomains: ScaleDomainSnapshot;
  effectiveDomains: ScaleDomainSnapshot;
  lineage: LineageStore<number>;
  candidates: CandidateStore;
}): RenderModel {
  const { scene, trained, prepared, panelLayout } = input;
  const { xTraining, yTraining, panelScales, colorResolution, fillResolution, styleResolutions } =
    trained;
  return assembleRenderModel({
    scene,
    xScale: xTraining.scale,
    yScale: yTraining.scale,
    color: colorResolution.resolved,
    fill: fillResolution.resolved,
    styles: Object.fromEntries(
      Object.entries(styleResolutions).map(([aesthetic, resolution]) => [
        aesthetic,
        resolution.resolved,
      ]),
    ),
    panelScales,
    colorState: colorResolution.state,
    fillState: fillResolution.state,
    styleStates: Object.fromEntries(
      Object.entries(styleResolutions).map(([aesthetic, resolution]) => [
        aesthetic,
        resolution.state,
      ]),
    ),
    warnings: input.warnings,
    advisories: input.advisories,
    scaleDecisions: prepared.scaleDecisions,
    scaleDiagnostics: prepared.scaleDiagnostics,
    guidePlans: Object.freeze([
      ...panelLayout.guidePlans,
      ...(colorResolution.guidePlan === null ? [] : [colorResolution.guidePlan]),
      ...(fillResolution.guidePlan === null ? [] : [fillResolution.guidePlan]),
      ...Object.values(styleResolutions).flatMap((resolution) =>
        resolution.guidePlan === null ? [] : [resolution.guidePlan],
      ),
    ]),
    coordProjectors: input.coordProjectors,
    flipped: input.flipped,
    xConversion: prepared.xConversion,
    yConversion: prepared.yConversion,
    runId: input.runId,
    layerBackends: input.layerBackends,
    layerFields: input.layerFields,
    layerScaledConstants: input.layerScaledConstants,
    baselineDomains: input.baselineDomains,
    effectiveDomains: input.effectiveDomains,
    lineage: input.lineage,
    candidates: input.candidates,
    formatX: panelLayout.formatX,
    formatY: panelLayout.formatY,
    // Retain the unfiltered source table + multi-table registry: model.row()
    // resolves global source-row indices (#589).
    table: prepared.sourceTable,
    sourceRegistry: prepared.sourceRegistry,
  });
}
