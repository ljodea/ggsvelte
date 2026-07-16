/**
 * Non-identity stat branches for LayerFrame construction (count/bin/density/
 * smooth/boxplot/summary). Returns null for identity so the caller can fall through.
 */
import type { ColumnTable } from "../table.js";

import { buildBinFrame, buildCountFrame, buildDensityFrame } from "./frame-stats-binning.js";
import { buildBoxplotFrame, buildSmoothFrame, buildSummaryFrame } from "./frame-stats-fit.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildNonIdentityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame | null {
  const stat = binding.layer.stat ?? "identity";
  if (stat === "identity") return null;

  if (stat === "count") return buildCountFrame(binding, table, groups, warnings);
  if (stat === "bin") return buildBinFrame(binding, table, groups, warnings, advisories, binRange);
  if (stat === "density") return buildDensityFrame(binding, table, groups, warnings);
  if (stat === "smooth") return buildSmoothFrame(binding, table, groups, warnings, advisories);
  if (stat === "boxplot") return buildBoxplotFrame(binding, table, groups, warnings);
  if (stat === "summary") return buildSummaryFrame(binding, table, groups, warnings);

  return null;
}
