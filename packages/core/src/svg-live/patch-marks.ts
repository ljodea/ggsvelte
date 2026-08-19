/**
 * Positional SVG mark patching for the live-update path (#1471).
 *
 * Each writer computes the exact attribute map the corresponding emitter in
 * ../render-svg-marks.ts would serialize — same names, same px() formatting,
 * same resolvers, same conditional-omission rules — for the previous and next
 * batch, then writes only the differences onto the mounted DOM node. Callers
 * must have proven structural compatibility via sceneSignature (same batch
 * topology, same per-mark element kinds); writers still bail (return false)
 * on any surprise so the caller rebuilds the batch subtree from renderBatch's
 * string. A false return is always safe; a wrong patch never is.
 *
 * Diff inputs are the previously mounted batch and the next batch; raw
 * numbers/strings compare BEFORE px() formatting, so unchanged channels skip
 * both the format and the setAttribute (a same-value write still dirties the
 * node in Chromium's style engine).
 */
import {
  pointFillAt,
  pointShapeGeometry,
  pointShapePathD,
  resolvePathMark,
  resolveRectMark,
  resolveSegmentMark,
  type PointShapeGeometry,
} from "../mark-style.js";
import type {
  GeometryBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  SegmentsBatch,
} from "../scene.js";
import type { PointShape } from "../scales/style.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import { POINT_SHAPE_NAMES } from "@ggsvelte/spec";

import { paintFill, paintStroke, pathData } from "../render-svg-marks.js";
import { px } from "../render-svg-format.js";

export interface BatchPatchContext {
  theme: ThemeTokens;
  paintMode: "full" | "fallback";
}

/** Attribute value map: name → serialized value; ABSENT value is "". */
type AttrMap = Record<string, string>;

/** Write the diff between two emitter-exact attribute maps onto a node. */
function writeAttrs(el: Element, next: AttrMap, prev: AttrMap): void {
  for (const name of Object.keys(next)) {
    const n = next[name]!;
    if (n === (prev[name] ?? "")) continue;
    if (n === "") el.removeAttribute(name);
    else el.setAttribute(name, n);
  }
  for (const name of Object.keys(prev)) {
    if (!(name in next) && prev[name] !== "") el.removeAttribute(name);
  }
}

/** Per-mark shape: constant, or the shapeIndexes entry when aes.shape is mapped. */
function shapeAt(batch: PointsBatch, j: number): PointShape {
  return batch.shapeIndexes === undefined
    ? batch.shape
    : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!;
}

// --- points ---------------------------------------------------------------

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
  const opacity = batch.alphas === undefined ? "" : px(batch.alphas?.[j] ?? 1);
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
  if (opacity !== "" && opacity !== "1") attrs["opacity"] = opacity;
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

/** Write the opacity attr following alphaAttr's omission rule (absent at 1). */
function writeAlpha(el: Element, alpha: number): void {
  if (alpha === 1) el.removeAttribute("opacity");
  else el.setAttribute("opacity", px(alpha));
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
function patchPoints(
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

// --- paths ----------------------------------------------------------------

/** Attributes of one path subpath, mirroring renderPaths exactly. */
function pathAttrs(
  batch: PathsBatch,
  s: number,
  themeColors: { ink: string; accent: string },
  ctx: BatchPatchContext,
): AttrMap | null {
  const start = batch.pathOffsets[s]!;
  const end = batch.pathOffsets[s + 1]!;
  if (end <= start) return null; // emitter skips; signature excludes this case
  const d = pathData(
    batch.positions,
    start,
    end,
    batch.curve,
    batch.closed === true,
    batch.ringStarts,
  );
  if (d === "") return null;
  const style = resolvePathMark(batch, s, themeColors);
  const alpha = batch.alphas?.[s];
  const attrs: AttrMap = { d };
  if (batch.fills === undefined) {
    attrs["fill"] = "none";
    attrs["stroke"] = paintStroke(
      style.stroke === "none" ? themeColors.ink : style.stroke,
      batch.strokePaint,
      ctx.paintMode,
    );
    attrs["stroke-width"] = px(style.width);
    if (style.dash.length > 0) attrs["stroke-dasharray"] = dashStr(style.dash);
    attrs["stroke-linejoin"] = style.linejoin;
    attrs["stroke-linecap"] = style.linecap;
  } else {
    attrs["fill"] = paintFill(
      style.fill === "none" ? themeColors.accent : style.fill,
      batch.fillPaint,
      ctx.paintMode,
    );
    if (style.stroke === "none") {
      attrs["stroke"] = "none";
    } else {
      attrs["stroke"] = paintStroke(style.stroke, batch.strokePaint, ctx.paintMode);
      attrs["stroke-width"] = px(style.width);
      if (style.dash.length > 0) attrs["stroke-dasharray"] = dashStr(style.dash);
      attrs["stroke-linejoin"] = style.linejoin;
      attrs["stroke-linecap"] = style.linecap;
    }
    if (batch.fillRule !== undefined) attrs["fill-rule"] = batch.fillRule;
  }
  if (alpha !== undefined && alpha !== 1) attrs["opacity"] = px(alpha);
  return attrs;
}

/** Path style branch: 0 = area stroke-none, 1 = area stroked, 2 = line. */
function pathBranch(batch: PathsBatch, stroke: string): number {
  return batch.fills === undefined ? 2 : stroke === "none" ? 0 : 1;
}

/** stroke-dasharray value, absent ("") when the dash list is empty. */
function dashStr(dash: readonly number[]): string {
  return dash.length === 0 ? "" : dash.join(" ");
}

/** Write-if-changed with removal support: "" means the attr must be absent. */
function writeOrRemove(el: Element, name: string, vN: string, vP: string): void {
  if (vN === vP) return;
  if (vN === "") el.removeAttribute(name);
  else el.setAttribute(name, vN);
}

/**
 * Hot path for dense line/area updates: the `d` rebuild is skipped when the
 * span's vertices are bit-identical between scenes (raw Float32 compares —
 * no string formatting for unchanged paths), and style channels compare as
 * resolved scalars. The expensive pathData format runs only for spans that
 * actually moved. A stroke-presence branch change (data-driven stroke
 * toggling "none") falls back to the exact attribute-map diff.
 */
function patchPaths(
  group: SVGGElement,
  prev: PathsBatch,
  next: PathsBatch,
  ctx: BatchPatchContext,
): boolean {
  const themeColors = { ink: themeVar("ink", ctx.theme), accent: themeVar("accent", ctx.theme) };
  const kids = group.children;
  const subpaths = next.pathOffsets.length - 1;
  const w = writeOrRemove;
  // Signature equality guarantees the non-empty span sequence aligns 1:1.
  let k = 0;
  for (let s = 0; s < subpaths; s++) {
    const start = next.pathOffsets[s]!;
    const end = next.pathOffsets[s + 1]!;
    if (end <= start) continue;
    const el = kids[k]!;
    k++;
    if (el === undefined || el.tagName !== "path") return false;
    const styleN = resolvePathMark(next, s, themeColors);
    const styleP = resolvePathMark(prev, s, themeColors);
    if (pathBranch(next, styleN.stroke) !== pathBranch(prev, styleP.stroke)) {
      const na = pathAttrs(next, s, themeColors, ctx);
      const pa = pathAttrs(prev, s, themeColors, ctx);
      if (na === null || pa === null) return false;
      writeAttrs(el, na, pa);
      continue;
    }
    const pStart = prev.pathOffsets[s]!;
    const pEnd = prev.pathOffsets[s + 1]!;
    const len = end - start;
    let same =
      len === pEnd - pStart &&
      prev.curve === next.curve &&
      (prev.closed === true) === (next.closed === true);
    const rn = next.ringStarts;
    const rp = prev.ringStarts;
    if (same && (rn !== undefined || rp !== undefined)) {
      same =
        rn !== undefined &&
        rp !== undefined &&
        rn.length === rp.length &&
        Array.from(rn).every((v, i) => v === rp[i]);
    }
    for (let i = 0; same && i < len * 2; i++) {
      if (prev.positions[pStart * 2 + i] !== next.positions[start * 2 + i]) same = false;
    }
    if (!same) {
      const d = pathData(
        next.positions,
        start,
        end,
        next.curve,
        next.closed === true,
        next.ringStarts,
      );
      if (d === "") return false;
      el.setAttribute("d", d);
    }
    const b = pathBranch(next, styleN.stroke);
    if (b === 0) {
      w(
        el,
        "fill",
        paintFill(
          styleN.fill === "none" ? themeColors.accent : styleN.fill,
          next.fillPaint,
          ctx.paintMode,
        ),
        paintFill(
          styleP.fill === "none" ? themeColors.accent : styleP.fill,
          prev.fillPaint,
          ctx.paintMode,
        ),
      );
    } else {
      w(
        el,
        "stroke",
        paintStroke(
          b === 2 && styleN.stroke === "none" ? themeColors.ink : styleN.stroke,
          next.strokePaint,
          ctx.paintMode,
        ),
        paintStroke(
          b === 2 && styleP.stroke === "none" ? themeColors.ink : styleP.stroke,
          prev.strokePaint,
          ctx.paintMode,
        ),
      );
      if (styleN.width !== styleP.width) el.setAttribute("stroke-width", px(styleN.width));
      w(el, "stroke-dasharray", dashStr(styleN.dash), dashStr(styleP.dash));
      w(el, "stroke-linejoin", styleN.linejoin, styleP.linejoin);
      w(el, "stroke-linecap", styleN.linecap, styleP.linecap);
      if (b === 1) {
        w(
          el,
          "fill",
          paintFill(
            styleN.fill === "none" ? themeColors.accent : styleN.fill,
            next.fillPaint,
            ctx.paintMode,
          ),
          paintFill(
            styleP.fill === "none" ? themeColors.accent : styleP.fill,
            prev.fillPaint,
            ctx.paintMode,
          ),
        );
      }
    }
    w(el, "fill-rule", next.fillRule ?? "", prev.fillRule ?? "");
    const alphaN = next.alphas?.[s] ?? 1;
    if (alphaN !== (prev.alphas?.[s] ?? 1)) writeAlpha(el, alphaN);
  }
  return k === kids.length;
}

// --- rects ----------------------------------------------------------------

/** Attributes of one rect mark, mirroring renderRects exactly. */
function rectAttrs(
  batch: RectsBatch,
  j: number,
  themeColors: { accent: string; paper: string; ink: string },
): AttrMap {
  const style = resolveRectMark(batch, j, themeColors);
  const attrs: AttrMap = {
    x: px(batch.rects[j * 4]!),
    y: px(batch.rects[j * 4 + 1]!),
    width: px(batch.rects[j * 4 + 2]!),
    height: px(batch.rects[j * 4 + 3]!),
    fill: style.fill,
  };
  if (style.stroke !== undefined) {
    attrs["stroke"] = style.stroke;
    attrs["stroke-width"] = px(style.strokeWidth);
    if (style.dash.length > 0) attrs["stroke-dasharray"] = style.dash.join(" ");
  }
  if (batch.alphas !== undefined && style.alpha !== 1) attrs["opacity"] = px(style.alpha);
  return attrs;
}

function patchRects(
  group: SVGGElement,
  prev: RectsBatch,
  next: RectsBatch,
  ctx: BatchPatchContext,
): boolean {
  const themeColors = {
    accent: themeVar("accent", ctx.theme),
    paper: themeVar("paper", ctx.theme),
    ink: themeVar("ink", ctx.theme),
  };
  const kids = group.children;
  const n = next.rects.length / 4;
  if (kids.length !== n) return false;
  for (let j = 0; j < n; j++) {
    const el = kids[j]!;
    if (el.tagName !== "rect") return false;
    writeAttrs(el, rectAttrs(next, j, themeColors), rectAttrs(prev, j, themeColors));
  }
  return true;
}

// --- segments -------------------------------------------------------------

/** Attributes of one segment mark, mirroring renderSegments exactly. */
function segmentAttrs(
  batch: SegmentsBatch,
  j: number,
  themeInk: string,
  ctx: BatchPatchContext,
): AttrMap {
  const mark = resolveSegmentMark(batch, j, themeInk);
  const stroke = paintStroke(mark.stroke, batch.strokePaint, ctx.paintMode);
  const attrs: AttrMap = {};
  if (batch.renderPositions !== undefined && batch.renderPathOffsets !== undefined) {
    attrs["d"] = pathData(
      batch.renderPositions,
      batch.renderPathOffsets[j]!,
      batch.renderPathOffsets[j + 1]!,
      "linear",
    );
    attrs["fill"] = "none";
  } else {
    attrs["x1"] = px(batch.segments[j * 4]!);
    attrs["y1"] = px(batch.segments[j * 4 + 1]!);
    attrs["x2"] = px(batch.segments[j * 4 + 2]!);
    attrs["y2"] = px(batch.segments[j * 4 + 3]!);
  }
  attrs["stroke"] = stroke;
  attrs["stroke-width"] = px(mark.width);
  if (mark.dash.length > 0) attrs["stroke-dasharray"] = mark.dash.join(" ");
  if (batch.alphas !== undefined && mark.alpha !== 1) attrs["opacity"] = px(mark.alpha);
  if (mark.linecap !== undefined) attrs["stroke-linecap"] = mark.linecap;
  return attrs;
}

function patchSegments(
  group: SVGGElement,
  prev: SegmentsBatch,
  next: SegmentsBatch,
  ctx: BatchPatchContext,
): boolean {
  const themeInk = themeVar("ink", ctx.theme);
  const kids = group.children;
  const n = next.rowIndex.length;
  if (kids.length !== n) return false;
  const asPath = next.renderPositions !== undefined && next.renderPathOffsets !== undefined;
  const tag = asPath ? "path" : "line";
  for (let j = 0; j < n; j++) {
    const el = kids[j]!;
    if (el.tagName !== tag) return false;
    writeAttrs(el, segmentAttrs(next, j, themeInk, ctx), segmentAttrs(prev, j, themeInk, ctx));
  }
  return true;
}

// --- group-level attrs + dispatch ------------------------------------------

/** Group attrs every batch emitter writes (opacity; filter for glow kinds). */
function patchGroupAttrs(
  group: SVGGElement,
  prev: GeometryBatch,
  next: GeometryBatch,
  ctx: BatchPatchContext,
): void {
  const opacity = next.alpha === 1 ? "" : px(next.alpha);
  const prevOpacity = prev.alpha === 1 ? "" : px(prev.alpha);
  writeAttrs(group, { opacity }, { opacity: prevOpacity });
  const glowOf = (b: GeometryBatch): string => {
    if (b.kind !== "paths" && b.kind !== "segments") return "";
    const glow = b.glow;
    return glow === undefined || ctx.paintMode === "fallback" ? "" : `url(#${glow.id})`;
  };
  writeAttrs(group, { filter: glowOf(next) }, { filter: glowOf(prev) });
}

/**
 * Patch one mounted batch group against the next batch. Returns false when
 * the batch is not positionally patchable (glyphs, or any structural
 * surprise) — the caller rebuilds the group from the emitter string.
 */
export function patchBatchGroup(
  group: SVGGElement,
  prev: GeometryBatch,
  next: GeometryBatch,
  ctx: BatchPatchContext,
): boolean {
  if (prev.kind !== next.kind) return false;
  let ok: boolean;
  switch (next.kind) {
    case "points":
      ok = patchPoints(group, prev as PointsBatch, next, ctx);
      break;
    case "paths":
      ok = patchPaths(group, prev as PathsBatch, next, ctx);
      break;
    case "rects":
      ok = patchRects(group, prev as RectsBatch, next, ctx);
      break;
    case "segments":
      ok = patchSegments(group, prev as SegmentsBatch, next, ctx);
      break;
    case "glyphs":
      return false;
  }
  if (ok) patchGroupAttrs(group, prev, next, ctx);
  return ok;
}
