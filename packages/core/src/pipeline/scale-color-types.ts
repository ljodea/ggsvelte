/**
 * Shared color/fill scale resolution result type.
 */
import type { LegendInput } from "../legend.js";
import type { GuidePlan } from "../layout/temporal-guide.js";
import type { ScaleState } from "../scales/state.js";

import type { ResolvedColorScale } from "./types.js";

export interface ColorResolution {
  resolved: ResolvedColorScale | null;
  legendInput: LegendInput | null;
  guidePlan: Exclude<GuidePlan, { type: "axis" }> | null;
  state: ScaleState | null;
}
