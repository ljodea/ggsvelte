/**
 * Map a scene primitive back to a post-stat frame row and series group.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";

export function resolveCandidateFrameRow(input: {
  frame: LayerFrame | undefined;
  batch: GeometryBatch;
  primitiveIndex: number;
  orderedGroups: readonly number[];
  outlierLocalRow: number | null;
}): { frameRow: number; derivedGroup: number } {
  const { frame, batch, primitiveIndex, orderedGroups, outlierLocalRow } = input;
  let frameRow = Math.min(primitiveIndex, Math.max(0, (frame?.n ?? 1) - 1));
  let derivedGroup = frame?.groups[frameRow] ?? 0;

  if (frame !== undefined && batch.kind === "paths") {
    let subpath = 0;
    while (
      subpath + 1 < batch.pathOffsets.length &&
      primitiveIndex >= batch.pathOffsets[subpath + 1]!
    )
      subpath++;
    derivedGroup = orderedGroups[Math.min(subpath, orderedGroups.length - 1)] ?? 0;
    const rowsInGroup = frame.groups
      .map((group, row) => ({ group, row }))
      .filter((entry) => entry.group === derivedGroup)
      .map((entry) => entry.row)
      .toSorted((a, b) => (frame.xNumeric?.[a] ?? a) - (frame.xNumeric?.[b] ?? b));
    const local = primitiveIndex - (batch.pathOffsets[subpath] ?? 0);
    const reflected =
      local < rowsInGroup.length ? local : Math.max(0, rowsInGroup.length * 2 - 1 - local);
    frameRow = rowsInGroup[Math.min(reflected, rowsInGroup.length - 1)] ?? frameRow;
  } else if (frame !== undefined && batch.kind === "segments") {
    if (frame.binding.layer.geom === "errorbar") frameRow = Math.floor(primitiveIndex / 3);
    else if (frame.binding.layer.geom === "boxplot" && batch.rowIndex.length >= frame.n * 2)
      frameRow = Math.floor(primitiveIndex / 2);
    derivedGroup = frame.groups[Math.min(frameRow, frame.groups.length - 1)] ?? derivedGroup;
  } else if (
    frame?.box !== null &&
    frame?.binding.layer.geom === "boxplot" &&
    batch.kind === "points"
  ) {
    frameRow = frame.box.outlierBox[primitiveIndex] ?? frameRow;
    derivedGroup = frame.groups[frameRow] ?? derivedGroup;
  } else if (outlierLocalRow !== null && frame !== undefined) {
    // outlier points already resolved via outlierBox above when geom matches;
    // keep default frameRow for other point batches.
  }

  return { frameRow, derivedGroup };
}
