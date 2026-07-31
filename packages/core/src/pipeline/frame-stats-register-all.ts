/**
 * Side-effect registration of every non-identity stat frame builder.
 * Imported by the full `@ggsvelte/core` package entry only.
 */
import { buildAlignFrame } from "./frame-stats-align.js";
import { buildBindotFrame } from "./frame-stats-bindot.js";
import { buildBinFrame } from "./frame-stats-bin.js";
import { buildBin2dFrame } from "./frame-stats-bin-2d.js";
import { buildBinHexFrame } from "./frame-stats-bin-hex.js";
import { buildBoxplotFrame } from "./frame-stats-boxplot.js";
import { buildConnectFrame } from "./frame-stats-connect.js";
import { buildContourFrame } from "./frame-stats-contour.js";
import { buildCountFrame } from "./frame-stats-count.js";
import { buildDensityFrame } from "./frame-stats-density.js";
import { buildDensity2dFrame } from "./frame-stats-density-2d.js";
import { buildEcdfFrame } from "./frame-stats-ecdf.js";
import { buildEllipseFrame } from "./frame-stats-ellipse.js";
import { buildFunctionFrame } from "./frame-stats-function.js";
import { buildManualFrame } from "./frame-stats-manual.js";
import { buildQqFrame, buildQqLineFrame } from "./frame-stats-qq.js";
import { buildQuantileFrame } from "./frame-stats-quantile.js";
import { registerStatFrame } from "./frame-stats-registry.js";
import { buildSfCoordinatesFrame } from "./frame-stats-sf-coordinates.js";
import { buildSfFrame } from "./frame-stats-sf.js";
import { buildSmoothFrame } from "./frame-stats-smooth.js";
import { buildSumFrame } from "./frame-stats-sum.js";
import { buildSummaryFrame } from "./frame-stats-summary.js";
import { buildSummaryBinFrame } from "./frame-stats-summary-bin.js";
import { buildUniqueFrame } from "./frame-stats-unique.js";
import { buildYDensityFrame } from "./frame-stats-ydensity.js";

let registered = false;

/** Idempotent: safe to import from the package barrel more than once. */
export function registerAllStatFrames(): void {
  if (registered) return;
  registered = true;

  registerStatFrame("sf", (binding, table, groups, warnings) =>
    buildSfFrame(binding, table, groups, warnings),
  );
  registerStatFrame("sf_coordinates", (binding, table, groups, warnings) =>
    buildSfCoordinatesFrame(binding, table, groups, warnings),
  );
  registerStatFrame("unique", (binding, table, groups) => buildUniqueFrame(binding, table, groups));
  registerStatFrame("manual", (binding, table, groups, warnings) =>
    buildManualFrame(binding, table, groups, warnings),
  );
  registerStatFrame("align", (binding, table, groups, warnings) =>
    buildAlignFrame(binding, table, groups, warnings),
  );
  registerStatFrame("connect", (binding, table, groups, warnings) =>
    buildConnectFrame(binding, table, groups, warnings),
  );
  registerStatFrame("ellipse", (binding, table, groups, warnings) =>
    buildEllipseFrame(binding, table, groups, warnings),
  );
  registerStatFrame("count", (binding, table, groups, warnings) =>
    buildCountFrame(binding, table, groups, warnings),
  );
  registerStatFrame("bin", (binding, table, groups, warnings, advisories, binRange) =>
    buildBinFrame(binding, table, groups, warnings, advisories, binRange),
  );
  registerStatFrame("bin_hex", (binding, table, groups, warnings, advisories) =>
    buildBinHexFrame(binding, table, groups, warnings, advisories),
  );
  registerStatFrame("summary_bin", (binding, table, groups, warnings, advisories, binRange) =>
    buildSummaryBinFrame(binding, table, groups, warnings, advisories, binRange),
  );
  registerStatFrame("bindot", (binding, table, groups, warnings, advisories, binRange) =>
    buildBindotFrame(binding, table, groups, warnings, advisories, binRange),
  );
  registerStatFrame("bin_2d", (binding, table, groups, warnings, advisories) =>
    buildBin2dFrame(binding, table, groups, warnings, advisories),
  );
  registerStatFrame("density", (binding, table, groups, warnings) =>
    buildDensityFrame(binding, table, groups, warnings),
  );
  registerStatFrame("sum", (binding, table, groups, warnings) =>
    buildSumFrame(binding, table, groups, warnings),
  );
  registerStatFrame("ydensity", (binding, table, groups, warnings) =>
    buildYDensityFrame(binding, table, groups, warnings),
  );
  registerStatFrame("ecdf", (binding, table, groups, warnings) =>
    buildEcdfFrame(binding, table, groups, warnings),
  );
  registerStatFrame("density_2d", (binding, table, groups, warnings) =>
    buildDensity2dFrame(binding, table, groups, warnings),
  );
  registerStatFrame("density_2d_filled", (binding, table, groups, warnings) =>
    buildDensity2dFrame(binding, table, groups, warnings),
  );
  registerStatFrame("smooth", (binding, table, groups, warnings, advisories) =>
    buildSmoothFrame(binding, table, groups, warnings, advisories),
  );
  registerStatFrame("quantile", (binding, table, groups, warnings) =>
    buildQuantileFrame(binding, table, groups, warnings),
  );
  registerStatFrame("contour", (binding, table, groups, warnings) =>
    buildContourFrame(binding, table, groups, warnings),
  );
  registerStatFrame("boxplot", (binding, table, groups, warnings) =>
    buildBoxplotFrame(binding, table, groups, warnings),
  );
  registerStatFrame("summary", (binding, table, groups, warnings) =>
    buildSummaryFrame(binding, table, groups, warnings),
  );
  registerStatFrame("function", (binding, table, _groups, warnings, _adv, _bin, functionDomain) =>
    buildFunctionFrame(binding, table, warnings, functionDomain),
  );
  registerStatFrame("qq", (binding, table, groups, warnings) =>
    buildQqFrame(binding, table, groups, warnings),
  );
  registerStatFrame("qq_line", (binding, table, groups, warnings) =>
    buildQqLineFrame(binding, table, groups, warnings),
  );
}

registerAllStatFrames();
