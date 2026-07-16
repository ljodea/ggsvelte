/**
 * Empty-data warning for preparePanels.
 */
import type { PipelineWarning } from "./types.js";

export function warnEmptyData(warnings: PipelineWarning[]): void {
  warnings.push({
    code: "empty-data",
    message: "The data has no rows; rendering the frame and axes as a placeholder.",
  });
}
