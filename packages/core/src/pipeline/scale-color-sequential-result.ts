/**
 * Pack sequential scale resolution into ColorResolution legend input.
 */
import { timeTicks } from "../layout/time.js";
import type { SequentialColorScale } from "../scales/color.js";

import type { ColorResolution } from "./scale-color-types.js";

export function sequentialColorResolution(
  name: "color" | "fill",
  legendTitle: string,
  scale: SequentialColorScale,
  format: (v: number) => string,
): ColorResolution {
  return {
    resolved: { kind: "sequential", scale },
    legendInput: {
      kind: "ramp",
      scale: name,
      title: legendTitle,
      domain: scale.domain,
      at: (t: number) => scale.at(t),
      format,
      ...(scale.temporal === true && {
        ticks: timeTicks(scale.domain[0], scale.domain[1], 5).values,
      }),
    },
    state: null,
  };
}
