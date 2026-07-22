import { pathSubpathIndex } from "../../candidate-geometry.js";
import type { GeometryBatch } from "../../scene.js";
import type { LayerFrame } from "../types.js";

// ---------------------------------------------------------------------------
// Candidate frame row
// ---------------------------------------------------------------------------
/**
 * Build per-group frame-row indices sorted by xNumeric (fallback: row index).
 * Path candidate resolution looks up local vertex → frame row from this index.
 */
export function buildPathGroupSortedRows(
  frame: Pick<LayerFrame, "groups" | "xNumeric">,
): Map<number, number[]> {
  const byGroup = new Map<number, number[]>();
  for (let row = 0; row < frame.groups.length; row++) {
    const group = frame.groups[row]!;
    const rows = byGroup.get(group);
    if (rows === undefined) byGroup.set(group, [row]);
    else rows.push(row);
  }
  for (const rows of byGroup.values()) {
    rows.sort((a, b) => (frame.xNumeric?.[a] ?? a) - (frame.xNumeric?.[b] ?? b));
  }
  return byGroup;
}

/** One sorted-row index per LayerFrame for the duration of candidate construction. */
const pathGroupSortedRowsCache = new WeakMap<
  Pick<LayerFrame, "groups" | "xNumeric">,
  Map<number, number[]>
>();

/** Return the cached per-group sorted rows for `frame`, building once if needed. */
export function getPathGroupSortedRows(
  frame: Pick<LayerFrame, "groups" | "xNumeric">,
): Map<number, number[]> {
  let cached = pathGroupSortedRowsCache.get(frame);
  if (cached !== undefined) return cached;
  cached = buildPathGroupSortedRows(frame);
  pathGroupSortedRowsCache.set(frame, cached);
  return cached;
}

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
    // After coord projection, candidate facts pass semanticIndex (pre-render
    // topology) as primitiveIndex. Render pathOffsets are post-tessellation and
    // cannot index that space; reconstruct group/local from frame groups instead.
    if (batch.semanticIndex === undefined) {
      // O(log P) subpath lookup (was linear O(P) per vertex → O(V·P) at build).
      // Null = OOB / empty offsets: keep default frameRow/derivedGroup (codex P1).
      const subpath = pathSubpathIndex(batch.pathOffsets, primitiveIndex);
      if (subpath !== null) {
        derivedGroup = orderedGroups[Math.min(subpath, orderedGroups.length - 1)] ?? 0;
        const rowsInGroup = getPathGroupSortedRows(frame).get(derivedGroup) ?? [];
        const local = primitiveIndex - (batch.pathOffsets[subpath] ?? 0);
        const reflected =
          local < rowsInGroup.length ? local : Math.max(0, rowsInGroup.length * 2 - 1 - local);
        frameRow = rowsInGroup[Math.min(reflected, rowsInGroup.length - 1)] ?? frameRow;
      }
    } else if (batch.closed === true) {
      // Closed ribbons: upper ascending + lower descending per group (2× rows).
      const sorted = getPathGroupSortedRows(frame);
      let cursor = 0;
      let matched = false;
      for (const group of orderedGroups) {
        const rowsInGroup = sorted.get(group) ?? [];
        const band = rowsInGroup.length * 2;
        if (primitiveIndex >= cursor && primitiveIndex < cursor + band) {
          const local = primitiveIndex - cursor;
          const reflected =
            local < rowsInGroup.length ? local : Math.max(0, rowsInGroup.length * 2 - 1 - local);
          frameRow = rowsInGroup[Math.min(reflected, rowsInGroup.length - 1)] ?? frameRow;
          derivedGroup = group;
          matched = true;
          break;
        }
        cursor += band;
      }
      if (!matched) {
        frameRow = Math.min(Math.max(0, primitiveIndex), Math.max(0, frame.n - 1));
        derivedGroup = frame.groups[frameRow] ?? derivedGroup;
      }
    } else {
      // Open paths: semantic index is the pre-split vertex / frame row.
      frameRow = Math.min(Math.max(0, primitiveIndex), Math.max(0, frame.n - 1));
      derivedGroup = frame.groups[frameRow] ?? derivedGroup;
    }
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
