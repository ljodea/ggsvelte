/**
 * Candidate-store datum factories derived from bound layers.
 */
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";
import type {
  CandidateBuildFacts,
  CandidateDatum,
  ResolvedCandidateInspectMode,
} from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import type { LayerBinding, ResolvedColorScale } from "./types.js";
import { deriveLayerGroups, interceptList } from "./frame-helpers.js";

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
    const ordinalRank = (resolved: ResolvedColorScale | null, field: string | null) => {
      if (resolved?.kind !== "ordinal" || field === null) return -1;
      const key = bandKey(value(field));
      return resolved.scale.domain.findIndex((domainValue) => bandKey(domainValue) === key);
    };
    const colorRank = ordinalRank(color, binding.color.field);
    const fillRank = ordinalRank(fill, binding.fill.field);
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

export function candidateAutoMode(
  binding: LayerBinding,
  primitiveIndex: number,
): ResolvedCandidateInspectMode {
  switch (binding.layer.geom) {
    case "point":
    case "text":
      return "xy";
    case "col":
    case "bar":
      return "exact";
    case "line":
    case "area":
    case "density":
    case "smooth":
    case "errorbar":
    case "boxplot":
      return "x";
    case "rule": {
      if (binding.ruleForm === "vertical") return "x";
      if (binding.ruleForm === "horizontal") return "y";
      const params = (binding.layer.params ?? {}) as { xintercept?: unknown };
      return primitiveIndex < interceptList(params.xintercept).length ? "x" : "y";
    }
    default:
      return "xy";
  }
}
