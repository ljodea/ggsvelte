/**
 * Shape/linetype finite-style data-aware scale checks.
 * Barrel: validate-data-checks-style.ts. Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import type { FieldEvidenceEntry, FieldEvidenceMap } from "./validate-data-evidence.js";
import type { ChannelFieldUse } from "./validate-data-checks-temporal.js";

/**
 * Shape/linetype: continuous fields need an explicit finite-style scale type.
 * Order: runs before numeric style / position / color so diagnostic order is stable.
 * Uses evidenceForUse when provided so multi-table same-name fields stay independent (#844).
 */
export function checkFiniteStyleScaleDataCompatibility(input: {
  scales: Record<string, unknown> | undefined;
  fields: FieldEvidenceMap;
  /**
   * Optional per-use evidence lookup. When provided, prefer it over the
   * last-wins `fields` union so multi-table layers with the same field name
   * keep their own type evidence (#609 / #844).
   */
  evidenceForUse?: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  finiteStyleFields: Record<"shape" | "linetype", ChannelFieldUse[]>;
}): SpecError[] {
  const { scales, fields, finiteStyleFields } = input;
  const errors: SpecError[] = [];
  const evidenceOf = (use: ChannelFieldUse) => input.evidenceForUse?.(use) ?? fields.get(use.field);
  const typeOf = (use: ChannelFieldUse) => evidenceOf(use)?.type ?? null;
  for (const aesthetic of ["shape", "linetype"] as const) {
    const config = scales?.[aesthetic] as { type?: string } | undefined;
    if (config?.type !== undefined) continue;
    for (const use of finiteStyleFields[aesthetic]) {
      const type = typeOf(use);
      if (type !== "quantitative" && type !== "temporal") continue;
      // A binned finite style requires numeric values: the runtime rejects
      // temporal (date/datetime) values with `unsupported-aesthetic-scale`
      // ("cannot be mapped to named symbols", scale-style.ts). So only
      // quantitative fields may be directed to "binned"; temporal fields must
      // use "ordinal", which keys arbitrary values (Dates included) to symbols.
      const isTemporal = type === "temporal";
      errors.push({
        code: "scale-type-mismatch",
        path: `/scales/${aesthetic}`,
        message: `Field "${use.field}" is ${type}, but ${aesthetic} has finite symbols and cannot infer continuous interpolation.`,
        fix: {
          description: isTemporal
            ? `Set scales.${aesthetic}.type to "ordinal"; temporal (date/datetime) values cannot be binned onto named symbols.`
            : `Set scales.${aesthetic}.type to "binned", or explicitly choose "ordinal" for identifier-like values.`,
          example: { type: isTemporal ? "ordinal" : "binned" },
        },
      });
    }
  }
  return errors;
}
