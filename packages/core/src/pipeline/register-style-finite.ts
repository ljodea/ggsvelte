import { resolveFiniteStyleScale } from "./scale-style-finite.js";
import { registerStyleScaleResolver } from "./scale-style-registry.js";
import type { FiniteStyleAesthetic, FiniteStyleConfig } from "./scale-style-types.js";

let registered = false;

/** Register shape/linetype style resolvers. Idempotent. */
export function registerFiniteStyle(): void {
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
}
