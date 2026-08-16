import { resolveNumericStyleScale } from "./scale-style-numeric.js";
import { registerStyleScaleResolver } from "./scale-style-registry.js";
import type { NumericStyleAesthetic } from "./scale-style-types.js";
import type { NumericStyleConfig } from "./scale-style-values.js";

let registered = false;

/** Register size/linewidth/alpha style resolvers (includes sequential). Idempotent. */
export function registerNumericStyle(): void {
  if (registered) return;
  registered = true;
  registerStyleScaleResolver("numeric", (input) =>
    resolveNumericStyleScale({
      aesthetic: input.aesthetic as NumericStyleAesthetic,
      values: input.values,
      catalog: input.catalog,
      anyDiscrete: input.anyDiscrete,
      anyIndexable: input.anyIndexable,
      ...(input.nonInteractiveValues !== undefined && {
        nonInteractiveValues: input.nonInteractiveValues,
      }),
      config: input.config as NumericStyleConfig | undefined,
      prevState: input.prevState,
      title: input.title,
      warnings: input.warnings,
    }),
  );
}
