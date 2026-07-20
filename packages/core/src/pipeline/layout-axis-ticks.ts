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
  for (let index = 0; index < ticks.length; index++) {
    const tick = ticks[index]!;
    // Band ticks carry their typed domain position because explicit breaks
    // may filter or reorder presentation ticks independently of the domain.
    const t =
      scale.type === "band"
        ? scale.normalize(
            tick.domainIndex === undefined
              ? index < scale.rawDomain.length
                ? scale.rawDomain[index]
                : tick.value
              : scale.rawDomain[tick.domainIndex],
          )
        : scale.normalize(tick.value as number);
    if (t === undefined || Number.isNaN(t)) continue;
    const pos = fromEnd ? extent - t * extent : t * extent;
    out.push({ pos, label: tick.labeled ? tick.label : "" });
  }
  return out;
}
