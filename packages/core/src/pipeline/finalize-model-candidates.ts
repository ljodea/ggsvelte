/**
 * Build lineage store + interaction candidates during finalize.
 */
import { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { CandidateStore } from "../candidate-store.js";

import { buildPipelineCandidates } from "./build-candidates.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { LayerBinding, MappedField } from "./types.js";

export function buildFinalizeCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  bindings: readonly LayerBinding[];
  layerFields: MappedField[][];
}): { lineage: LineageStore<number>; candidates: CandidateStore } {
  const { scene, runId, flip, prepared, trained, bindings, layerFields } = input;
  const lineage = new LineageStore<number>();
  const candidates = buildPipelineCandidates({
    scene,
    runId,
    flip,
    bindings,
    panelFrames: prepared.panelFrames,
    facetPanels: prepared.facetPanels,
    table: prepared.table,
    layerFields,
    color: trained.colorResolution.resolved,
    fill: trained.fillResolution.resolved,
    lineage,
  });
  return { lineage, candidates };
}
