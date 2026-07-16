/**
 * Layer backends, tooltip fields, and scaled constants for finalize.
 */
import type { PortableSpec } from "@ggsvelte/spec";
import type { CellValue } from "../table.js";
import type { Scene } from "../scene.js";

import {
  resolveLayerBackends,
  resolveLayerFields,
  resolveLayerScaledConstants,
} from "./layer-contracts.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { Advisory, LayerBackend, LayerBinding, MappedField, RunOptions } from "./types.js";

export function resolveFinalizeLayerContracts(input: {
  normalized: PortableSpec;
  options: RunOptions;
  prepared: PreparedPanels;
  scene: Scene;
  advisories: Advisory[];
}): {
  layerBackends: LayerBackend[];
  layerFields: MappedField[][];
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  bindings: readonly LayerBinding[];
} {
  const { normalized, options, prepared, scene, advisories } = input;
  const { bindings } = prepared;
  return {
    layerBackends: resolveLayerBackends(
      normalized.layers,
      scene.batches,
      normalized.a11y,
      options.canvasThreshold,
      advisories,
    ),
    layerFields: resolveLayerFields(normalized.layers.length, bindings),
    layerScaledConstants: resolveLayerScaledConstants(normalized.layers.length, bindings),
    bindings,
  };
}
