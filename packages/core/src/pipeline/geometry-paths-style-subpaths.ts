/** Split grouped line vertices whenever an edge's mapped stroke style changes. */
import type { LayerFrame } from "./types.js";
import { mappedStyleOutput, type ResolvedStyleScales } from "./geometry-style.js";

export function splitStyleSubpaths(
  frame: LayerFrame,
  groupedRows: readonly (readonly number[])[],
  styles: ResolvedStyleScales,
): number[][] {
  const hasMappedStyle = (["linewidth", "alpha", "linetype"] as const).some((aesthetic) => {
    const style = frame.binding[aesthetic];
    return style.field !== null || style.statColumn !== null || style.scaledConstant !== null;
  });
  if (!hasMappedStyle) return groupedRows.map((rows) => [...rows]);

  const styleKey = (row: number): string =>
    JSON.stringify([
      mappedStyleOutput(frame, "linewidth", row, styles),
      mappedStyleOutput(frame, "alpha", row, styles),
      mappedStyleOutput(frame, "linetype", row, styles),
    ]);
  const subpaths: number[][] = [];
  for (const rows of groupedRows) {
    if (rows.length < 2) {
      subpaths.push([...rows]);
      continue;
    }
    let run = [rows[0]!];
    let runKey = styleKey(rows[0]!);
    for (let index = 0; index < rows.length - 1; index++) {
      const edgeKey = styleKey(rows[index]!);
      if (edgeKey !== runKey && run.length > 1) {
        subpaths.push(run);
        run = [rows[index]!];
        runKey = edgeKey;
      }
      run.push(rows[index + 1]!);
    }
    subpaths.push(run);
  }
  return subpaths;
}
