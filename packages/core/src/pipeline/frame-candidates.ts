/**
 * Candidate-store datum factories derived from bound layers.
 */
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import { ordinalColorRank } from "./build-candidates-datum-ordinal-rank.js";
import { candidateAutoMode } from "./frame-candidates-auto-mode.js";
import type { LayerBinding, ResolvedColorScale } from "./types.js";
import { deriveLayerGroups } from "./frame-helpers.js";

export { candidateAutoMode } from "./frame-candidates-auto-mode.js";

export function createRawCandidateDatumResolver(
  bindings: readonly LayerBinding[],
  table: ColumnTable,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  lineage: LineageStore<number>,
): (facts: CandidateBuildFacts) => CandidateDatum {
  const groupsByLayer = new Map<number, readonly number[]>();
  const groupsFor = (layerIndex: number): readonly number[] => {
    let groups = groupsByLayer.get(layerIndex);
    if (groups === undefined) {
      const binding = bindings[layerIndex];
      groups = binding === undefined ? [] : deriveLayerGroups(binding, table);
      groupsByLayer.set(layerIndex, groups);
    }
    return groups;
  };
  return (facts) => {
    const binding = bindings[facts.layerIndex];
    const sourceRow = facts.rowIndex;
    if (binding === undefined || sourceRow === null) return {};
    const value = (field: string | null): CellValue =>
      field === null ? null : table.column(field)[sourceRow]!;
    const group = groupsFor(facts.layerIndex)[sourceRow] ?? 0;
    const colorRank = ordinalColorRank(color, binding.color.field, () =>
      value(binding.color.field),
    );
    const fillRank = ordinalColorRank(fill, binding.fill.field, () => value(binding.fill.field));
    return {
      xValue: value(binding.xField),
      yValue: value(binding.yField),
      seriesId: group,
      seriesRank: colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group,
      sourceOrder: sourceRow,
      lineage: lineage.intern([sourceRow]),
      autoMode: candidateAutoMode(binding, facts.primitiveIndex),
    };
  };
}
