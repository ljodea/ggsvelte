/**
 * Resolve layer contracts and domain snapshots for the finalize phase.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { computeBaselineDomains, computeEffectiveDomains } from "./compute-domains.js";
import {
  resolveLayerBackends,
  resolveLayerFields,
  resolveLayerScaledConstants,
} from "./layer-contracts.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type {
  Advisory,
  LayerBackend,
  MappedField,
  RunOptions,
  ScaleDomainSnapshot,
} from "./types.js";
import type { CellValue } from "../table.js";
import type { Scene } from "../scene.js";
import type { LayerBinding } from "./types.js";

export function resolveFinalizeContracts(input: {
  normalized: PortableSpec;
  options: RunOptions;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  scene: Scene;
  advisories: Advisory[];
}): {
  layerBackends: LayerBackend[];
  layerFields: MappedField[][];
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  effectiveDomains: ScaleDomainSnapshot;
  baselineDomains: ScaleDomainSnapshot;
  bindings: readonly LayerBinding[];
} {
  const { normalized, options, prepared, trained, scene, advisories } = input;
  const { freeX, freeY, facetPanels, bindings, panelFrames } = prepared;
  const { xTraining, yTraining, panelScales, xInputs, yInputs } = trained;

  const layerBackends = resolveLayerBackends(
    normalized.layers,
    scene.batches,
    normalized.a11y,
    options.canvasThreshold,
    advisories,
  );
  const layerFields = resolveLayerFields(normalized.layers.length, bindings);
  const layerScaledConstants = resolveLayerScaledConstants(normalized.layers.length, bindings);

  const effectiveDomains = computeEffectiveDomains(xTraining.scale, yTraining.scale, panelScales);
  const baselineDomains = computeBaselineDomains({
    options,
    freeX,
    freeY,
    facetPanels,
    panelFrames,
    xInputs,
    yInputs,
    effectiveDomains,
  });

  return {
    layerBackends,
    layerFields,
    layerScaledConstants,
    effectiveDomains,
    baselineDomains,
    bindings,
  };
}
