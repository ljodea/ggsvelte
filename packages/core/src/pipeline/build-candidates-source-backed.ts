/**
 * Source-backed candidate store path (identity layers, no annotations).
 */
import { buildCandidateStore } from "../candidate-store.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";

import { createRawCandidateDatumResolver } from "./frame.js";
import type { LayerBinding, ResolvedColorScale } from "./types.js";

export function isAllSourceBacked(bindings: readonly LayerBinding[]): boolean {
  return bindings.every(
    (binding) =>
      (binding.layer.stat ?? "identity") === "identity" && binding.ruleForm !== "annotation",
  );
}

export function buildSourceBackedCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  table: ColumnTable;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
}): CandidateStore {
  const { scene, runId, flip, bindings, table, color, fill, lineage } = input;
  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    datum: createRawCandidateDatumResolver(bindings, table, color, fill, lineage),
  });
}
