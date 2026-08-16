import { registerContinuousLegend } from "../legend-register-continuous.js";
import { resolveBinnedColorScale } from "./scale-color-binned.js";
import { registerColorScaleResolver } from "./scale-color-registry.js";

let registered = false;

/** Register the binned color/fill resolver. Idempotent. */
export function registerBinnedColor(): void {
  if (registered) return;
  registered = true;
  registerContinuousLegend();
  registerColorScaleResolver("binned", (input) =>
    resolveBinnedColorScale({
      name: input.name,
      values: input.values,
      config: input.config ?? { type: "binned" },
      legendTitle: input.legendTitle,
      warnings: input.warnings,
      editionDefaults: input.editionDefaults,
    }),
  );
}
