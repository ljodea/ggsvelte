/**
 * Normalize + validate a pipeline spec entry.
 */
import type { PortableSpec, SpecInput } from "@ggsvelte/spec";
import { normalize, SpecValidationError, validate } from "@ggsvelte/spec";

export function normalizeAndValidateSpec(spec: SpecInput | PortableSpec): PortableSpec {
  const normalized = normalize(spec);
  const result = validate(normalized);
  if (!result.ok) throw new SpecValidationError(result.errors);
  return normalized;
}
