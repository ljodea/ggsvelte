/**
 * Warn and clear color mappings on fill-only geoms.
 */
import type { ColorBinding, PipelineWarning } from "./types.js";

export function applyColorOnFillGeomWarning(
  geom: string,
  index: number,
  color: ColorBinding,
  warnings: PipelineWarning[],
): void {
  if (
    (geom === "bar" ||
      geom === "col" ||
      geom === "area" ||
      geom === "boxplot" ||
      geom === "density" ||
      geom === "raster") &&
    (color.field !== null || color.constant !== null || color.scaledConstant !== null)
  ) {
    warnings.push({
      code: "color-on-fill-geom",
      message: `Layer ${index} (${geom}): the color channel styles OUTLINES, which this geom does not support as a data channel yet — map "fill" instead. The color mapping is ignored.`,
    });
    color.field = null;
    color.constant = null;
    color.scaledConstant = null;
  }
}
