/**
 * Non-identity stat branches for LayerFrame construction (count/bin/density/
 * smooth/boxplot/summary). Returns null for identity so the caller can fall through.
 */
import type { ColumnTable } from "../table.js";

import { buildAlignFrame } from "./frame-stats-align.js";
import { buildBindotFrame } from "./frame-stats-bindot.js";
import { buildBinFrame, buildCountFrame, buildDensityFrame } from "./frame-stats-binning.js";
import { buildBin2dFrame } from "./frame-stats-bin-2d.js";
import { buildBinHexFrame } from "./frame-stats-bin-hex.js";
import { buildEcdfFrame } from "./frame-stats-ecdf.js";
import { buildConnectFrame } from "./frame-stats-connect.js";
import { buildDensity2dFrame } from "./frame-stats-density-2d.js";
import { buildEllipseFrame } from "./frame-stats-ellipse.js";
import { buildBoxplotFrame, buildSmoothFrame, buildSummaryFrame } from "./frame-stats-fit.js";
import { buildQqFrame, buildQqLineFrame } from "./frame-stats-qq.js";
import { buildManualFrame } from "./frame-stats-manual.js";
import { buildContourFrame } from "./frame-stats-contour.js";
import { buildQuantileFrame } from "./frame-stats-quantile.js";
import { buildSummaryBinFrame } from "./frame-stats-summary-bin.js";
import { buildSfCoordinatesFrame } from "./frame-stats-sf-coordinates.js";
import { buildSfFrame } from "./frame-stats-sf.js";
import { buildUniqueFrame } from "./frame-stats-unique.js";
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

  // ggplot2 stat_sf: expand portable GeoJSON to drawable parts (#809 phase 7).
  if (stat === "sf") return buildSfFrame(binding, table, groups, warnings);
  if (stat === "sf_coordinates") return buildSfCoordinatesFrame(binding, table, groups, warnings);
  if (stat === "unique") return buildUniqueFrame(binding, table, groups);
  if (stat === "manual") return buildManualFrame(binding, table, groups, warnings);
  if (stat === "align") return buildAlignFrame(binding, table, groups, warnings);
  if (stat === "connect") return buildConnectFrame(binding, table, groups, warnings);
  if (stat === "ellipse") return buildEllipseFrame(binding, table, groups, warnings);
  if (stat === "count") return buildCountFrame(binding, table, groups, warnings);
  if (stat === "bin") return buildBinFrame(binding, table, groups, warnings, advisories, binRange);
  if (stat === "bin_hex") return buildBinHexFrame(binding, table, groups, warnings, advisories);
  if (stat === "summary_bin")
    return buildSummaryBinFrame(binding, table, groups, warnings, advisories, binRange);
  if (stat === "bindot")
    return buildBindotFrame(binding, table, groups, warnings, advisories, binRange);
  if (stat === "bin_2d") return buildBin2dFrame(binding, table, groups, warnings, advisories);
  if (stat === "density") return buildDensityFrame(binding, table, groups, warnings);
  if (stat === "ecdf") return buildEcdfFrame(binding, table, groups, warnings);
  if (stat === "density_2d" || stat === "density_2d_filled") {
    return buildDensity2dFrame(binding, table, groups, warnings);
  }
  if (stat === "smooth") return buildSmoothFrame(binding, table, groups, warnings, advisories);
  if (stat === "quantile") return buildQuantileFrame(binding, table, groups, warnings);
  if (stat === "contour") return buildContourFrame(binding, table, groups, warnings);
  if (stat === "boxplot") return buildBoxplotFrame(binding, table, groups, warnings);
  if (stat === "summary") return buildSummaryFrame(binding, table, groups, warnings);
  if (stat === "qq") return buildQqFrame(binding, table, groups, warnings);
  if (stat === "qq_line") return buildQqLineFrame(binding, table, groups, warnings);

  return null;
}
