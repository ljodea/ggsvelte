/**
 * Explicit lossy RuntimeSpec → PortableSpec conversion for tooling.
 * Strict checks: portability-check.ts. Public facade: portability.ts.
 */
import type { PortableSpec } from "./schema.js";
import type { RuntimeSpec } from "./runtime.js";
import { isPlainObject, type JSONValue } from "./portability-check.js";

export interface LossyResult {
  spec: PortableSpec;
  /** Paths that were REMOVED because they cannot travel as JSON. */
  dropped: string[];
}

function lossyClone(
  value: unknown,
  path: string,
  seen: Set<object>,
  dropped: string[],
): { keep: boolean; value?: JSONValue } {
  switch (typeof value) {
    case "string":
    case "boolean":
      return { keep: true, value };
    case "number":
      return { keep: true, value: Number.isFinite(value) ? value : null };
    case "function":
    case "symbol":
    case "undefined":
    case "bigint":
      dropped.push(path);
      return { keep: false };
    default:
      break;
  }
  if (value === null) return { keep: true, value: null };
  const obj = value as object;
  if (seen.has(obj)) {
    dropped.push(path);
    return { keep: false };
  }
  if (obj instanceof Date) {
    // Coercion, not a drop: dates travel as ISO strings per the plan.
    return { keep: true, value: Number.isNaN(obj.getTime()) ? null : obj.toISOString() };
  }
  if (Array.isArray(obj)) {
    seen.add(obj);
    const out: JSONValue[] = [];
    for (let i = 0; i < obj.length; i++) {
      const r = lossyClone(obj[i], `${path}/${i}`, seen, dropped);
      // Dropped array elements become null so indices stay row-aligned.
      out.push(r.keep ? r.value! : null);
    }
    seen.delete(obj);
    return { keep: true, value: out };
  }
  if (!isPlainObject(obj)) {
    dropped.push(path);
    return { keep: false };
  }
  seen.add(obj);
  const out: { [key: string]: JSONValue } = {};
  for (const [key, v] of Object.entries(obj)) {
    const r = lossyClone(v, `${path}/${key}`, seen, dropped);
    if (r.keep) out[key] = r.value!;
  }
  seen.delete(obj);
  return { keep: true, value: out };
}

/**
 * Explicit lossy conversion for tooling: strips `{ fn }` accessors and any
 * other unserializable values, returning the portable remainder plus the list
 * of dropped paths. Dates are coerced to ISO strings, non-finite numbers to
 * null (coercions are not reported as drops).
 */
export function toPortableLossy(spec: RuntimeSpec): LossyResult {
  const dropped: string[] = [];
  const r = lossyClone(spec, "", new Set(), dropped);
  return { spec: (r.keep ? r.value : {}) as unknown as PortableSpec, dropped };
}
