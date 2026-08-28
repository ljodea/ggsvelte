/**
 * Positional patching of point-mark batch groups for the live-update path
 * (#1471). The written attrs must match the renderPoints/pointShape emitters
 * attribute-for-attribute (see ../render-svg-marks.ts); a false return is
 * always safe, a wrong patch never is.
 */
import {
  pointFillAt,
  pointShapeGeometry,
  pointShapePathD,
  type PointShapeGeometry,
} from "../mark-style.js";
import type { PointsBatch } from "../scene.js";
import type { PointShape } from "../scales/style.js";
import { themeVar } from "../theme.js";
import { POINT_SHAPE_NAMES } from "@ggsvelte/spec";
import { px } from "../render-svg-format.js";
import { writeAttrs, writeAlpha } from "./patch-attrs.js";
import type { BatchPatchContext } from "./patch-attrs.js";
import type { AttrMap } from "./patch-attrs.js";

/** Per-mark shape: constant, or the shapeIndexes entry when aes.shape is mapped. */
function shapeAt(batch: PointsBatch, j: number): PointShape {
  return batch.shapeIndexes === undefined
    ? batch.shape
    : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!;
}

/** Attributes of one point mark, mirroring renderPoints/pointShape exactly. */
function pointAttrs(
  batch: PointsBatch,
  j: number,
  themeInk: string,
): { tag: string; attrs: AttrMap } | null {
  const shape = shapeAt(batch, j);
  const size = batch.sizes?.[j] ?? batch.size;
  const x = batch.positions[j * 2]!;
  const y = batch.positions[j * 2 + 1]!;
  const geometry = pointShapeGeometry(shape, x, y, size);
  const fill = pointFillAt(batch, j, themeInk);
  const alphaRaw = batch.alphas?.[j] ?? 1;
  const attrs: AttrMap = { class: `gg-shape-${shape}` };
  let tag: string;
  switch (geometry.kind) {
    case "circle":
      tag = "circle";
      attrs["cx"] = px(geometry.cx);
      attrs["cy"] = px(geometry.cy);
      attrs["r"] = px(geometry.r);
      if (geometry.mode === "stroke") {
        attrs["fill"] = "none";
        attrs["stroke"] = fill;
        attrs["stroke-width"] = px(geometry.strokeWidth);
      } else {
        attrs["fill"] = fill;
      }
      break;
    case "rect":
      tag = "rect";
      attrs["x"] = px(geometry.x);
      attrs["y"] = px(geometry.y);
      attrs["width"] = px(geometry.width);
      attrs["height"] = px(geometry.height);
      attrs["fill"] = fill;
      break;
    case "polygon":
      tag = "path";
      attrs["d"] = pointShapePathD(geometry, px);
      attrs["fill"] = fill;
      break;
    case "lines":
      tag = "path";
      attrs["d"] = pointShapePathD(geometry, px);
      attrs["fill"] = "none";
      attrs["stroke"] = fill;
      attrs["stroke-width"] = px(geometry.strokeWidth);
      break;
    default:
      return null;
  }
  // alphaAttr omission rule: absent iff the raw alpha is exactly 1; a value
  // that merely rounds to "1" is still emitted by the string renderer.
  if (batch.alphas !== undefined && alphaRaw !== 1) attrs["opacity"] = px(alphaRaw);
  return { tag, attrs };
}

/**
 * Write the fill-carrying attr(s) of a point mark. Which attribute carries
 * the color depends on the shape's geometry kind (stroke-mode circle and
 * lines-kind shapes paint via stroke, everything else via fill); the other
 * channel is the constant "none" and never needs a write.
 */
function writePointFill(el: Element, geometry: PointShapeGeometry, fill: string): void {
  const stroked =
    (geometry.kind === "circle" && geometry.mode === "stroke") || geometry.kind === "lines";
  el.setAttribute(stroked ? "stroke" : "fill", fill);
}

/** Element-wise equality for optional string lists (palettes). */
function sameStringList(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Hot path for the 10k+ scatter case: compare RAW batch values (positions,
 * sizes, fill strings, alphas) before any px() formatting, so unchanged
 * channels skip both the format and the setAttribute. Per-mark shape changes
 * (rare; only when aes.shape is data-mapped) fall back to the exact
 * attribute-map diff, which also covers tag/mode changes.
 */
export function patchPoints(
  group: SVGGElement,
  prev: PointsBatch,
  next: PointsBatch,
  ctx: BatchPatchContext,
): boolean {
  const themeInk = themeVar("ink", ctx.theme);
  const kids = group.children;
  const n = next.rowIndex.length;
  if (kids.length !== n) return false;
  // Batch-level fill facts: when both batches index the same palette, a
  // point's fill can only move when its index does — a numeric compare that
  // skips two string resolutions per point. Anything else (palette churn,
  // mixed colors/palette paths, fill scalar moves) compares resolved strings.
  const paletteSame = sameStringList(prev.colorPalette, next.colorPalette);
  const indexedCompare =
    paletteSame && prev.colorIndexes !== undefined && next.colorIndexes !== undefined;
  for (let j = 0; j < n; j++) {
    const el = kids[j]!;
    const shape = shapeAt(next, j);
    if (shape !== shapeAt(prev, j)) {
      const nextMark = pointAttrs(next, j, themeInk);
      const prevMark = pointAttrs(prev, j, themeInk);
      if (nextMark === null || prevMark === null) return false;
      if (el.tagName !== nextMark.tag) return false;
      writeAttrs(el, nextMark.attrs, prevMark.attrs);
      continue;
    }
    const x = next.positions[j * 2]!;
    const y = next.positions[j * 2 + 1]!;
    const size = next.sizes?.[j] ?? next.size;
    const prevX = prev.positions[j * 2]!;
    const prevY = prev.positions[j * 2 + 1]!;
    const prevSize = prev.sizes?.[j] ?? prev.size;
    const xChanged = x !== prevX;
    const yChanged = y !== prevY;
    const sizeChanged = size !== prevSize;
    const geometrySame = !xChanged && !yChanged && !sizeChanged;
    let fillChanged: boolean;
    if (indexedCompare) {
      const ci = next.colorIndexes![j]!;
      fillChanged = ci !== prev.colorIndexes![j]! || next.colorPalette![ci] === undefined;
      // A palette hole falls through to fill/themeInk — resolve strings then.
      if (fillChanged && next.colorPalette![ci] === undefined && prev.colorIndexes![j] === ci) {
        fillChanged = pointFillAt(next, j, themeInk) !== pointFillAt(prev, j, themeInk);
      }
    } else {
      fillChanged = pointFillAt(next, j, themeInk) !== pointFillAt(prev, j, themeInk);
    }
    const fill = fillChanged ? pointFillAt(next, j, themeInk) : "";
    const alpha = next.alphas?.[j] ?? 1;
    const alphaChanged = alpha !== (prev.alphas?.[j] ?? 1);
    if (geometrySame) {
      if (fillChanged) {
        // Geometry is stable, so the fill channel target follows the shape.
        const probe = pointShapeGeometry(shape, x, y, size);
        writePointFill(el, probe, fill);
      }
      if (alphaChanged) writeAlpha(el, alpha);
      continue;
    }
    const geometry = pointShapeGeometry(shape, x, y, size);
    switch (geometry.kind) {
      case "circle":
        if (el.tagName !== "circle") return false;
        // cx/r/stroke-width map 1:1 onto raw channels: write only the
        // channels that moved (the common update perturbs y only).
        if (xChanged) el.setAttribute("cx", px(geometry.cx));
        if (yChanged) el.setAttribute("cy", px(geometry.cy));
        if (sizeChanged) {
          el.setAttribute("r", px(geometry.r));
          if (geometry.mode === "stroke") {
            el.setAttribute("stroke-width", px(geometry.strokeWidth));
          }
        }
        if (geometry.mode === "stroke") {
          if (fillChanged) el.setAttribute("stroke", fill);
        } else if (fillChanged) {
          el.setAttribute("fill", fill);
        }
        break;
      case "rect":
        if (el.tagName !== "rect") return false;
        // Rect x/width derive from (x, size); y/height from (y, size).
        if (xChanged || sizeChanged) {
          el.setAttribute("x", px(geometry.x));
          el.setAttribute("width", px(geometry.width));
        }
        if (yChanged || sizeChanged) {
          el.setAttribute("y", px(geometry.y));
          el.setAttribute("height", px(geometry.height));
        }
        if (fillChanged) el.setAttribute("fill", fill);
        break;
      case "polygon":
        if (el.tagName !== "path") return false;
        el.setAttribute("d", pointShapePathD(geometry, px));
        if (fillChanged) el.setAttribute("fill", fill);
        break;
      case "lines":
        if (el.tagName !== "path") return false;
        el.setAttribute("d", pointShapePathD(geometry, px));
        el.setAttribute("stroke-width", px(geometry.strokeWidth));
        if (fillChanged) el.setAttribute("stroke", fill);
        break;
      default:
        return false;
    }
    if (alphaChanged) writeAlpha(el, alpha);
  }
  return true;
}
