import { registerDiscreteLegend } from "../legend-register-discrete.js";
import { resolveIdentityColorScale } from "./scale-color-identity.js";
import { registerColorScaleResolver } from "./scale-color-registry.js";

let registered = false;

/** Register the identity (pass-through) color/fill resolver. Idempotent. */
export function registerIdentityColor(): void {
  if (registered) return;
  registered = true;
  registerDiscreteLegend();
  registerColorScaleResolver("identity", (input) =>
    resolveIdentityColorScale({
      name: input.name,
      values: input.values,
      config: input.config ?? { type: "identity" },
      legendTitle: input.legendTitle,
      warnings: input.warnings,
    }),
  );
}
