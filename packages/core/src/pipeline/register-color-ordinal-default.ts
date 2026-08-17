import { registerDiscreteLegend } from "../legend-register-discrete.js";
import { getColorScaleResolver, registerColorScaleResolver } from "./scale-color-registry.js";
import { resolveDefaultOrdinalColorScale } from "./scale-color-ordinal-default.js";

let registered = false;

/**
 * Register ordinal color/fill for the built-in default palette or an explicit range.
 * Named schemes require {@link registerOrdinalColor} instead.
 */
export function registerDefaultOrdinalColor(): void {
  if (registered) return;
  registered = true;
  registerDiscreteLegend();
  if (getColorScaleResolver("ordinal") !== undefined) return;
  registerColorScaleResolver("ordinal", (input) => {
    const domainValues = input.catalogValues.length > 0 ? input.catalogValues : input.values;
    return resolveDefaultOrdinalColorScale({
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
