/**
 * Positional patching of path-mark batch groups (lines/areas) for the
 * live-update path (#1471). The written attrs must match the renderPaths
 * emitter attribute-for-attribute (see ../render-svg-marks.ts); a false
 * return is always safe, a wrong patch never is.
 */
import { resolvePathMark } from "../mark-style.js";
import type { PathsBatch } from "../scene.js";
import { themeVar } from "../theme.js";
import { paintFill, paintStroke, pathData } from "../render-svg-marks.js";
import { px } from "../render-svg-format.js";
import { writeAttrs, writeAlpha, writeOrRemove, type AttrMap } from "./patch-attrs.js";
import type { BatchPatchContext } from "./patch-attrs.js";

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

/**
 * Hot path for dense line/area updates: the `d` rebuild is skipped when the
 * span's vertices are bit-identical between scenes (raw Float32 compares —
 * no string formatting for unchanged paths), and style channels compare as
 * resolved scalars. The expensive pathData format runs only for spans that
 * actually moved. A stroke-presence branch change (data-driven stroke
 * toggling "none") falls back to the exact attribute-map diff.
 */
export function patchPaths(
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
