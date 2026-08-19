/**
 * Structural signatures for the live SVG patcher (#1471).
 *
 * The patcher fast-paths an update only when the new Scene is STRUCTURALLY
 * identical to the mounted one: same panel set, same batch topology, same
 * per-mark element kinds, same chrome skeleton. Anything the positional
 * writer cannot represent (a subpath appearing/disappearing, a mapped shape
 * flipping a circle into a path, a facet panel arriving) flips the signature
 * and the caller falls back to a full re-serialization — same behavior as
 * today's update path, never a wrong patch.
 *
 * Pure and DOM-free so bun unit tests can exercise it directly.
 */
import { letterboxGutterRects } from "../letterbox-gutters.js";
import type { GeometryBatch, Scene, ScenePanel } from "../scene.js";

/** Per-batch structural key: kind + primitive count + element-kind detail. */
function batchSignature(batch: GeometryBatch): string {
  switch (batch.kind) {
    case "points": {
      const n = batch.rowIndex.length;
      if (batch.shapeIndexes === undefined) {
        return `p:${n}:${batch.shape}`;
      }
      // Shape-mapped: per-mark element kinds are part of the structure.
      return `p:${n}:m:${batch.shapeIndexes.join(",")}`;
    }
    case "paths": {
      const subpaths = batch.pathOffsets.length - 1;
      // A subpath serializes only when it has vertices (renderPaths skips
      // d === ""); zero-length spans change the child sequence, so they are
      // structural. ringStarts windowing can only yield empty rings when the
      // owning span is empty, which the zero flag already covers.
      let zeroFlags = "";
      for (let s = 0; s < subpaths; s++) {
        const span = batch.pathOffsets[s + 1]! - batch.pathOffsets[s]!;
        zeroFlags += span === 0 ? "0" : "1";
      }
      return `l:${subpaths}:${zeroFlags}:${batch.closed === true ? "c" : "o"}:${
        batch.ringStarts === undefined ? "-" : batch.ringStarts.length
      }:${batch.fills === undefined ? "nofill" : "fill"}:${batch.fillRule ?? "nonzero"}`;
    }
    case "rects":
      return `r:${batch.rects.length / 4}:${batch.strokes === undefined ? "-" : "s"}:${
        batch.linetypeIndexes === undefined ? "-" : "d"
      }`;
    case "segments":
      return `s:${batch.rowIndex.length}:${batch.renderPositions === undefined ? "line" : "path"}`;
    case "glyphs":
      // Glyphs (labels) take the batch-rebuild path on every update; only
      // count stability is required to keep the group node position stable.
      return `g:${batch.rowIndex.length}`;
  }
  // Exhaustive over the closed GeometryBatch union; unreachable, and here so
  // a future kind fails loudly instead of being silently mispatched.
  throw new Error(`svg-live: unhandled batch kind ${(batch as GeometryBatch).kind}`);
}

function panelSignature(panel: ScenePanel, batches: readonly GeometryBatch[]): string {
  const letterbox =
    panel.allocation === undefined ? 0 : letterboxGutterRects(panel.allocation, panel).length;
  return [
    panel.axisX === null ? 0 : 1,
    panel.axisY === null ? 0 : 1,
    panel.strip === "" || panel.showStrip === false ? 0 : 1,
    panel.clip === false ? 0 : 1,
    letterbox,
    batches.map((b) => batchSignature(b)).join("+"),
  ].join(",");
}

/**
 * Serialize the structural skeleton of a scene. Two scenes with equal
 * signatures are guaranteed patch-compatible by the live SVG writer; any
 * difference forces a full remount. Deliberately conservative — cheap to
 * compute, false negatives only cost a remount.
 */
export function sceneSignature(scene: Scene): string {
  const batchesByPanel = new Map<number, GeometryBatch[]>();
  for (const batch of scene.batches) {
    const list = batchesByPanel.get(batch.panelIndex) ?? [];
    list.push(batch);
    batchesByPanel.set(batch.panelIndex, list);
  }
  const panels = scene.panels
    .map((p, i) => panelSignature(p, batchesByPanel.get(i) ?? []))
    .join(";");
  const legends = scene.legends
    .map((l) => `${l.type}:${l.scale}:${l.position ?? "right"}:${l.direction ?? "vertical"}`)
    .join(";");
  // Theme fingerprint: every token (ink/accent/paper fallbacks, fonts,
  // panel/border presence) feeds the emitted attributes, so ANY theme change
  // must remount — the patchers resolve both prev and next against the new
  // theme and would otherwise keep stale colors (Devin Review #1662).
  const theme = JSON.stringify(scene.theme);
  return [
    scene.width,
    scene.height,
    scene.layout ?? "-",
    scene.title === "" ? 0 : 1,
    scene.subtitle === "" ? 0 : 1,
    scene.caption === "" ? 0 : 1,
    theme,
    scene.axes.x.title === "" ? 0 : 1,
    scene.axes.y.title === "" ? 0 : 1,
    panels,
    legends,
  ].join("|");
}
