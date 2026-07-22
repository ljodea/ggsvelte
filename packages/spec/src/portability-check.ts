/**
 * Strict PortableSpec checks: walk for unserializable values, isPortable,
 * toPortable (rejecting). Lossy tooling conversion: portability-lossy.ts.
 * Public facade: portability.ts.
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

/** @internal Shared by strict walk and lossy clone. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
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
  // Prefer for…in over Object.entries: entries eagerly Gets every property
  // value (including later getters), defeating stopAfter. Engines still list
  // own keys up front (OwnPropertyKeys); the short-circuit here is on value
  // Gets and recursive walks — not on key listing. for…in also skips keys
  // deleted by an earlier getter before we reach them.
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
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
