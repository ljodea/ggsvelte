/**
 * Full geom batch registration — a composition over the granular
 * register-*.ts modules (#1420), so each geom family has exactly one source
 * of truth. Called by `registerAll()` (src/register.ts); NOT a module-scope
 * side effect anymore.
 */
import { registerBasicGeomBatches } from "./geometry-register-basic.js";
import { registerAbline } from "./register-abline.js";
import { registerBin2d } from "./register-bin-2d.js";
import { registerBoxplot } from "./register-boxplot.js";
import { registerContour } from "./register-contour.js";
import { registerCrossbar } from "./register-crossbar.js";
import { registerCurve } from "./register-curve.js";
import { registerDensity2d } from "./register-density-2d.js";
import { registerDensity2dFilled } from "./register-density-2d-filled.js";
import { registerDotplot } from "./register-dotplot.js";
import { registerErrorbar } from "./register-errorbar.js";
import { registerFunction } from "./register-function.js";
import { registerHex } from "./register-hex.js";
import { registerLinerange } from "./register-linerange.js";
import { registerMap } from "./register-map.js";
import { registerPointrange } from "./register-pointrange.js";
import { registerPolygon } from "./register-polygon.js";
import { registerQq } from "./register-qq.js";
import { registerQqLine } from "./register-qq-line.js";
import { registerQuantile } from "./register-quantile.js";
import { registerRaster } from "./register-raster.js";
import { registerRug } from "./register-rug.js";
import { registerSf } from "./register-sf.js";
import { registerSfLabel } from "./register-sf-label.js";
import { registerSfText } from "./register-sf-text.js";
import { registerSmooth } from "./register-smooth.js";
import { registerSpoke } from "./register-spoke.js";
import { registerTile } from "./register-tile.js";
import { registerViolin } from "./register-violin.js";

let registered = false;

/**
 * Register every geom batch builder (basic + specialty). Family functions
 * also register their paired stat frame where one exists — harmless here
 * (registries are plain Maps) and required when this composition runs from
 * registerAll() alongside registerAllStatFrames(). Idempotent.
 */
export function registerAllGeomBatches(): void {
  if (registered) return;
  registered = true;

  registerBasicGeomBatches();

  registerAbline();
  registerBin2d();
  registerBoxplot();
  registerContour();
  registerCrossbar();
  registerCurve();
  registerDensity2d();
  registerDensity2dFilled();
  registerDotplot();
  registerErrorbar();
  registerFunction();
  registerHex();
  registerLinerange();
  registerMap();
  registerPointrange();
  registerPolygon();
  registerQq();
  registerQqLine();
  registerQuantile();
  registerRaster();
  registerRug();
  registerSf();
  registerSfLabel();
  registerSfText();
  registerSmooth();
  registerSpoke();
  registerTile();
  registerViolin();
}
