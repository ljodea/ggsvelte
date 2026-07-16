/**
 * Resolve layer contracts and domain snapshots for the finalize phase.
 */
import type { PortableSpec } from "@ggsvelte/spec";
import type { CellValue } from "../table.js";
import type { Scene } from "../scene.js";

import { resolveFinalizeDomainSnapshots } from "./finalize-model-contracts-domains.js";
import { resolveFinalizeLayerContracts } from "./finalize-model-contracts-layers.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type {
  Advisory,
  LayerBackend,
  LayerBinding,
  MappedField,
  RunOptions,
  ScaleDomainSnapshot,
} from "./types.js";

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
  const layers = resolveFinalizeLayerContracts(input);
  const domains = resolveFinalizeDomainSnapshots(input);
  return { ...layers, ...domains };
}
