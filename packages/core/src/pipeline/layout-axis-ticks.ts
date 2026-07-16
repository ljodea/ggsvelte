/**
 * Project layout ticks through a scale onto an axis extent, in px.
 */
import type { LayoutResult } from "../layout/layout.js";
import type { PositionScale } from "../scales/train.js";
import type { SceneTick } from "../scene.js";

export function axisTicks(
  scale: PositionScale,
  ticks: LayoutResult["x"]["ticks"],
  extent: number,
  fromEnd: boolean,
): SceneTick[] {
  const out: SceneTick[] = [];
  for (const tick of ticks) {
    const t =
      scale.type === "band" ? scale.normalize(tick.value) : scale.normalize(tick.value as number);
    if (t === undefined || Number.isNaN(t)) continue;
    const pos = fromEnd ? extent - t * extent : t * extent;
    out.push({ pos, label: tick.labeled ? tick.label : "" });
  }
  return out;
}
