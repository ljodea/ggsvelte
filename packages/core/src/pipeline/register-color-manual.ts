import { resolveManualColorScale } from "./scale-color-manual.js";
import { registerColorScaleResolver } from "./scale-color-registry.js";

let registered = false;

/** Register the manual color/fill resolver. Idempotent. */
export function registerManualColor(): void {
  if (registered) return;
  registered = true;
  registerColorScaleResolver("manual", (input) =>
    resolveManualColorScale({
      name: input.name,
      values: input.catalogValues.length > 0 ? input.catalogValues : input.values,
      observedValues: input.values,
      config: input.config ?? { type: "manual", range: [] },
      legendTitle: input.legendTitle,
      warnings: input.warnings,
    }),
  );
}
