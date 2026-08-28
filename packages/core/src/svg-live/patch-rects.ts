/**
 * Positional patching of rect-mark batch groups (bars) for the live-update
 * path (#1471). The written attrs must match the renderRects emitter
 * attribute-for-attribute (see ../render-svg-marks.ts); a false return is
 * always safe, a wrong patch never is.
 */
import { resolveRectMark } from "../mark-style.js";
import type { RectsBatch } from "../scene.js";
import { themeVar } from "../theme.js";
import { px } from "../render-svg-format.js";
import { writeAttrs, type AttrMap } from "./patch-attrs.js";
import type { BatchPatchContext } from "./patch-attrs.js";

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

export function patchRects(
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
