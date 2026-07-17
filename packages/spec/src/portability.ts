/**
 * PortableSpec vs RuntimeSpec (plan: "Two spec types, explicitly split").
 *
 * PortableSpec is strictly JSON, defined over a recursive JSONValue: no Date,
 * undefined, functions, bigint, symbols, typed arrays, cycles, non-finite
 * numbers. Dates travel as ISO strings; non-finite numbers as null.
 *
 * RuntimeSpec is the in-memory superset: `{ fn }` channel accessors are legal.
 * - `isPortable()` narrows.
 * - `toPortable()` REJECTS with a structured error listing every
 *   unserializable path (one behavior, never "strip or reject").
 * - `toPortableLossy()` is the separate, explicit tool for tooling: it strips
 *   what cannot travel and returns `{ spec, dropped }` (dates are COERCED to
 *   ISO strings and non-finite numbers to null — coercions are not "dropped").
 */
import type { PortableSpec } from "./schema.js";
import type { RuntimeSpec } from "./runtime.js";

/** Any strictly-JSON value (what a PortableSpec is made of). */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | {
      [key: string]: JSONValue;
    };

export interface PortabilityIssue {
  /** JSON-pointer-ish path to the offending value (e.g. "/aes/x/fn"). */
  path: string;
  /** Why the value cannot travel as JSON. */
  reason: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function issueFor(value: unknown): string | null {
  switch (typeof value) {
    case "string":
    case "boolean":
      return null;
    case "number":
      return Number.isFinite(value)
        ? null
        : "non-finite number (portable specs encode NaN/Infinity as null)";
    case "undefined":
      return "undefined (omit the property instead)";
    case "function":
      return "function (use toPortableLossy() to strip { fn } accessors, or keep a RuntimeSpec)";
    case "symbol":
      return "symbol";
    case "bigint":
      return "bigint (convert to number or string)";
    default:
      return null; // objects handled by the walker
  }
}

/**
 * Walk a value tree, collecting portability issues.
 * When `stopAfter` is set, stop once that many issues are recorded (used by
 * `isPortable` for an early-exit existence check).
 */
function walk(
  value: unknown,
  path: string,
  seen: Set<object>,
  issues: PortabilityIssue[],
  stopAfter?: number,
): void {
  if (stopAfter !== undefined && issues.length >= stopAfter) return;

  const primitiveIssue = issueFor(value);
  if (primitiveIssue !== null) {
    issues.push({ path, reason: primitiveIssue });
    return;
  }
  if (typeof value !== "object" || value === null) return;
  if (seen.has(value)) {
    issues.push({ path, reason: "circular reference" });
    return;
  }
  if (value instanceof Date) {
    issues.push({
      path,
      reason: "Date (portable specs carry dates as ISO 8601 strings)",
    });
    return;
  }
  if (Array.isArray(value)) {
    seen.add(value);
    for (let i = 0; i < value.length; i++) {
      walk(value[i], `${path}/${i}`, seen, issues, stopAfter);
      if (stopAfter !== undefined && issues.length >= stopAfter) break;
    }
    seen.delete(value);
    return;
  }
  if (!isPlainObject(value)) {
    issues.push({
      path,
      reason: `non-plain object (${Object.prototype.toString.call(value)})`,
    });
    return;
  }
  seen.add(value);
  // Object.keys then value[key]: Object.entries eagerly evaluates every
  // property value (including getters), which would defeat stopAfter.
  for (const key of Object.keys(value)) {
    walk(value[key], `${path}/${key}`, seen, issues, stopAfter);
    if (stopAfter !== undefined && issues.length >= stopAfter) break;
  }
  seen.delete(value);
}

/** Every reason `value` fails to be strictly-JSON, with paths. Empty = portable. */
export function portabilityIssues(value: unknown): PortabilityIssue[] {
  const issues: PortabilityIssue[] = [];
  walk(value, "", new Set(), issues);
  return issues;
}

/** True when `spec` contains only strictly-JSON values (narrowing type guard). */
export function isPortable(spec: RuntimeSpec | PortableSpec): spec is PortableSpec {
  const issues: PortabilityIssue[] = [];
  walk(spec, "", new Set(), issues, 1);
  return issues.length === 0;
}

/** Thrown by toPortable(): lists EVERY unserializable path, not just the first. */
export class UnportableSpecError extends Error {
  readonly issues: readonly PortabilityIssue[];

  constructor(issues: readonly PortabilityIssue[]) {
    const lines = issues.map((i) => `  ${i.path || "/"}: ${i.reason}`);
    super(
      `Spec is not portable (${issues.length} issue${issues.length === 1 ? "" : "s"}):\n` +
        lines.join("\n"),
    );
    this.name = "UnportableSpecError";
    this.issues = issues;
  }
}

/**
 * Convert a RuntimeSpec to a PortableSpec, REJECTING (UnportableSpecError,
 * with every offending path) if anything unserializable is present.
 * Returns a structurally-shared-nothing deep copy.
 */
export function toPortable(spec: RuntimeSpec): PortableSpec {
  const issues = portabilityIssues(spec);
  if (issues.length > 0) throw new UnportableSpecError(issues);
  return JSON.parse(JSON.stringify(spec)) as PortableSpec;
}

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
