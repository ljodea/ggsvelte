/**
 * Full stat frame registration — a composition over the granular
 * register-*.ts modules (#1420), so each stat family has exactly one source
 * of truth. Called by `registerAll()` (src/register.ts); NOT a module-scope
 * side effect anymore.
 */
import { registerBasicStatFrames } from "./frame-stats-register-basic.js";
import { registerAlign } from "./register-align.js";
import { registerBin } from "./register-bin.js";
import { registerBin2d } from "./register-bin-2d.js";
import { registerBoxplot } from "./register-boxplot.js";
import { registerConnect } from "./register-connect.js";
import { registerContour } from "./register-contour.js";
import { registerDensity } from "./register-density.js";
import { registerDensity2d } from "./register-density-2d.js";
import { registerDensity2dFilled } from "./register-density-2d-filled.js";
import { registerDotplot } from "./register-dotplot.js";
import { registerEcdf } from "./register-ecdf.js";
import { registerEllipse } from "./register-ellipse.js";
import { registerFunction } from "./register-function.js";
import { registerHex } from "./register-hex.js";
import { registerManual } from "./register-manual.js";
import { registerQq } from "./register-qq.js";
import { registerQqLine } from "./register-qq-line.js";
import { registerQuantile } from "./register-quantile.js";
import { registerSf } from "./register-sf.js";
import { registerSfLabel } from "./register-sf-label.js";
import { registerSfText } from "./register-sf-text.js";
import { registerSmooth } from "./register-smooth.js";
import { registerSummary } from "./register-summary.js";
import { registerSummaryBin } from "./register-summary-bin.js";
import { registerSummaryRolling } from "./register-summary-rolling.js";
import { registerUnique } from "./register-unique.js";
import { registerViolin } from "./register-violin.js";

let registered = false;

/**
 * Register every non-identity stat frame builder. Family functions also
 * register their paired geom batch where one exists — harmless here
 * (registries are plain Maps) and required when this composition runs from
 * registerAll() alongside registerAllGeomBatches(). Idempotent.
 */
export function registerAllStatFrames(): void {
  if (registered) return;
  registered = true;

  registerBasicStatFrames();

  registerAlign();
  registerBin();
  registerBin2d();
  registerBoxplot();
  registerConnect();
  registerContour();
  registerDensity();
  registerDensity2d();
  registerDensity2dFilled();
  registerDotplot();
  registerEcdf();
  registerEllipse();
  registerFunction();
  registerHex();
  registerManual();
  registerQq();
  registerQqLine();
  registerQuantile();
  registerSf();
  registerSfLabel();
  registerSfText();
  registerSmooth();
  registerSummary();
  registerSummaryBin();
  registerSummaryRolling();
  registerUnique();
  registerViolin();
}
