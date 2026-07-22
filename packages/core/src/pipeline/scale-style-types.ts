import type { StyleAesthetic } from "@ggsvelte/spec";

import type { GuidePlan } from "../layout/temporal-guide.js";
import type { LegendInput } from "../legend.js";
import type { ResolvedStyleScale } from "../scales/style.js";
import type { ScaleState } from "../scales/state.js";

export interface StyleResolution {
  aesthetic: StyleAesthetic;
  resolved: ResolvedStyleScale | null;
  legendInput: LegendInput | null;
  guidePlan: Exclude<GuidePlan, { type: "axis" | "colorbar" | "colorsteps" }> | null;
  state: ScaleState | null;
}
