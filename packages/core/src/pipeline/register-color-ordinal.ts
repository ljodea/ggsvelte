import { resolveOrdinalColorScale } from "./scale-color-ordinal.js";
import { registerColorScaleResolver } from "./scale-color-registry.js";

let registered = false;

/** Register the ordinal (categorical) color/fill resolver. Idempotent. */
export function registerOrdinalColor(): void {
  if (registered) return;
  registered = true;
  registerColorScaleResolver("ordinal", (input) => {
    const domainValues = input.catalogValues.length > 0 ? input.catalogValues : input.values;
    return resolveOrdinalColorScale({
      name: input.name,
      values: domainValues.filter((value) => value !== null),
      config: input.config,
      prevState: input.prevState,
      legendTitle: input.legendTitle,
      warnings: input.warnings,
      advisories: input.advisories,
      editionDefaults: input.editionDefaults,
    });
  });
}
