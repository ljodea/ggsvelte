import { resolveSequentialColorScale } from "./scale-color-sequential.js";
import { registerColorScaleResolver } from "./scale-color-registry.js";

let registered = false;

/** Register the sequential (ramp) color/fill resolver. Idempotent. */
export function registerSequentialColor(): void {
  if (registered) return;
  registered = true;
  registerColorScaleResolver("sequential", (input) =>
    resolveSequentialColorScale({
      name: input.name,
      values: input.values,
      anyDiscreteField: input.anyDiscreteField,
      config: input.config,
      legendTitle: input.legendTitle,
      warnings: input.warnings,
      advisories: input.advisories,
      editionDefaults: input.editionDefaults,
    }),
  );
}
