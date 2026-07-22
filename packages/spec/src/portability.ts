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
 *
 * Implementation:
 *  - portability-check.ts — strict walk, isPortable, toPortable
 *  - portability-lossy.ts — toPortableLossy
 * This file re-exports the public surface so package imports stay on ./portability.js.
 */

export {
  isPortable,
  portabilityIssues,
  toPortable,
  UnportableSpecError,
  type JSONValue,
  type PortabilityIssue,
} from "./portability-check.js";

export { toPortableLossy, type LossyResult } from "./portability-lossy.js";
