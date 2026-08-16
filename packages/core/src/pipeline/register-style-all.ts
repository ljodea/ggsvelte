import { resolveFiniteStyleScale } from "./scale-style-finite.js";
import { resolveNumericStyleScale } from "./scale-style-numeric.js";
import { registerStyleScaleResolver } from "./scale-style-registry.js";
import type {
  FiniteStyleAesthetic,
  FiniteStyleConfig,
  NumericStyleAesthetic,
} from "./scale-style-types.js";
import type { NumericStyleConfig } from "./scale-style-values.js";

let registered = false;

/**
 * Register every style scale family. Idempotent.
 *
 * Imports the resolvers directly so `/render` / `registerBasic()` do not also
 * pull the per-family wrapper modules.
 */
export function registerAllStyleKinds(): void {
  if (registered) return;
  registered = true;
  registerStyleScaleResolver("finite", (input) =>
    resolveFiniteStyleScale({
      aesthetic: input.aesthetic as FiniteStyleAesthetic,
      values: input.values,
      catalog: input.catalog,
      anyDiscrete: input.anyDiscrete,
      anyIndexable: input.anyIndexable,
      ...(input.nonInteractiveValues !== undefined && {
        nonInteractiveValues: input.nonInteractiveValues,
      }),
      config: input.config as FiniteStyleConfig | undefined,
      prevState: input.prevState,
      title: input.title,
      warnings: input.warnings,
    }),
  );
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
