/**
 * Value-stable discrete scale state — the flagship correctness fix
 * (plan: "Scale stability"; graduated from the M0a-2 spike, decision 0002).
 *
 * Implements the scale-stability contract as pure, dependency-free code:
 *   - canonical key codec (encodeKey/decodeKey)
 *   - plain-JSON ScaleState with schema version + palette fingerprint
 *   - trainDiscrete with grow / pinned (explicit domain) / data semantics
 *   - palette exhaustion contract (cycle + one-time warning, or error)
 *   - serialize/adopt helpers for the SSR-adoption path
 *
 * trainDiscrete is pure — it never mutates prevState. The caller commits
 * result.state only after a successful latest-run pipeline pass (run-id
 * gating), which provides the plan's transactionality.
 */

// ---------------------------------------------------------------------------
// Canonical key codec
// ---------------------------------------------------------------------------
//
// Discrete domain values are keyed by an encoded string. Format:
//
//   plain string  ->  passes through unchanged, UNLESS it starts with '@',
//                     in which case one extra '@' is prepended ('@x' -> '@@x').
//   number        ->  '@n:' + String(v)   with '@n:NaN' and '@n:-0' special-cased
//                     ('@n:Infinity' / '@n:-Infinity' fall out of String()).
//   boolean       ->  '@b:true' | '@b:false'
//   bigint        ->  '@i:' + v.toString()
//   Date          ->  '@d:' + epoch millis   ('@d:NaN' for invalid dates)
//   null          ->  '@null'
//   undefined     ->  '@undefined'
//
// Decode rule: keys not starting with '@' are raw strings; '@@...' strips one
// '@' and yields the rest as a string; otherwise the tag is interpreted.
// This guarantees:  encodeKey('1') === '1'  !==  encodeKey(1) === '@n:1', and
// no user string can collide with a tagged encoding.

export function encodeKey(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value.startsWith("@") ? "@" + value : value;
    case "number":
      if (Number.isNaN(value)) return "@n:NaN";
      if (Object.is(value, -0)) return "@n:-0";
      return "@n:" + String(value);
    case "boolean":
      return "@b:" + String(value);
    case "bigint":
      return "@i:" + value.toString();
    case "undefined":
      return "@undefined";
    default:
      if (value === null) return "@null";
      if (value instanceof Date) {
        const t = value.getTime();
        return "@d:" + (Number.isNaN(t) ? "NaN" : String(t));
      }
      throw new TypeError(
        `Cannot encode discrete scale key of type ${Object.prototype.toString.call(value)}; ` +
          `discrete domains accept string | number | boolean | bigint | Date | null | undefined`,
      );
  }
}

export function decodeKey(key: string): unknown {
  if (!key.startsWith("@")) return key;
  if (key.startsWith("@@")) return key.slice(1);
  if (key === "@null") return null;
  if (key === "@undefined") return undefined;
  const tag = key.slice(0, 3);
  const body = key.slice(3);
  switch (tag) {
    case "@n:":
      if (body === "NaN") return NaN;
      if (body === "-0") return -0;
      return Number(body);
    case "@b:":
      if (body === "true") return true;
      if (body === "false") return false;
      break;
    case "@i:":
      return BigInt(body);
    case "@d:":
      return new Date(body === "NaN" ? NaN : Number(body));
  }
  throw new Error(`Malformed encoded scale key: ${JSON.stringify(key)}`);
}

// ---------------------------------------------------------------------------
// Hash (FNV-1a, 32-bit). NOT crypto-strength — the plan's "SHA" only needs a
// stable change-detector for palette identity; collisions are merely a missed
// invalidation and are astronomically unlikely for the tiny input space here.
// ---------------------------------------------------------------------------

export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.codePointAt(i)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Palette fingerprint
// ---------------------------------------------------------------------------

export interface DiscreteScaleSpec {
  /** Scale type, e.g. 'ordinal' (part of the fingerprint). */
  type: string;
  /** Resolved output range (colors, shapes, ...). Always resolved upstream. */
  range: readonly unknown[];
  /** Named scheme this range was resolved from; if set, the NAME is the
   *  palette identity (a re-resolved scheme array never invalidates). */
  scheme?: string;
  /** Explicit domain => pinned mode (suspends stored assignments). */
  domain?: readonly unknown[];
  /** 'grow' (default, value-stable) | 'data' (legacy rebuild-per-render). */
  domainMode?: "grow" | "data";
  /** Palette exhaustion contract. Default 'cycle' (+ one-time warning). */
  onExhaust?: "cycle" | "error";
}

/**
 * Fingerprint = hash(scale type, scheme name OR deep-value hash of the
 * resolved range array). Equal color VALUES in a fresh array produce the same
 * fingerprint; a changed scheme name or scale type produces a new one.
 * Range elements are length-prefixed encoded keys so ['ab','c'] != ['a','bc'].
 */
export function paletteFingerprint(
  spec: Pick<DiscreteScaleSpec, "type" | "range" | "scheme">,
): string {
  const type = `${spec.type.length}:${spec.type}`;
  const palette =
    spec.scheme === undefined || spec.scheme === null
      ? "r" +
        spec.range
          .map((v) => {
            const k = encodeKey(v);
            return `${k.length}:${k}`;
          })
          .join("")
      : `s${spec.scheme.length}:${spec.scheme}`;
  return fnv1a(`t${type}|${palette}`);
}

// ---------------------------------------------------------------------------
// ScaleState
// ---------------------------------------------------------------------------

export const SCALE_STATE_VERSION = 1 as const;

/** Plain-JSON serializable. `JSON.parse(JSON.stringify(state))` is lossless. */
export interface ScaleState {
  version: typeof SCALE_STATE_VERSION;
  fingerprint: string;
  /** [encodedKey, rawIndex] pairs; rawIndex may exceed range length (cycling
   *  is applied at lookup time: range[rawIndex % range.length]). */
  assignments: [string, number][];
  nextIndex: number;
  /** One-time-warning latch for palette exhaustion (persists across renders). */
  exhaustWarned: boolean;
}

export function freshScaleState(fingerprint: string): ScaleState {
  return {
    version: SCALE_STATE_VERSION,
    fingerprint,
    assignments: [],
    nextIndex: 0,
    exhaustWarned: false,
  };
}

// --- serialize / adopt (SSR payload embedding & persistence) ---------------

export function serializeScaleState(state: ScaleState): string {
  return JSON.stringify(state);
}

/** Parse + validate a serialized state (SSR payload or persisted storage).
 *  Throws on structurally invalid input; version mismatches are NOT thrown
 *  here — trainDiscrete degrades them to a fresh state + warning. */
export function adoptScaleState(json: string): ScaleState {
  const raw: unknown = JSON.parse(json);
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as ScaleState).version !== "number" ||
    typeof (raw as ScaleState).fingerprint !== "string" ||
    !Array.isArray((raw as ScaleState).assignments) ||
    typeof (raw as ScaleState).nextIndex !== "number"
  ) {
    throw new Error("adoptScaleState: input is not a valid ScaleState");
  }
  const s = raw as ScaleState;
  const exhaustWarned = (raw as Record<string, unknown>)["exhaustWarned"] === true;
  for (const pair of s.assignments) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      typeof pair[0] !== "string" ||
      typeof pair[1] !== "number"
    ) {
      throw new Error("adoptScaleState: malformed assignments entry");
    }
  }
  return {
    version: s.version,
    fingerprint: s.fingerprint,
    assignments: s.assignments.map(([k, i]) => [k, i] as [string, number]),
    nextIndex: s.nextIndex,
    exhaustWarned,
  };
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export type ScaleWarningCode =
  | "palette-exhausted"
  | "fingerprint-mismatch"
  | "version-mismatch"
  | "out-of-domain";

export interface ScaleWarning {
  code: ScaleWarningCode;
  message: string;
  /** Offending decoded values, when applicable (out-of-domain). */
  values?: unknown[];
}

export class PaletteExhaustedError extends Error {
  constructor(needed: number, rangeSize: number) {
    super(
      `Palette exhausted: ${needed} discrete values but range has only ` +
        `${rangeSize} entries and onExhaust is 'error'. Provide a larger ` +
        `range or an explicit domain.`,
    );
    this.name = "PaletteExhaustedError";
  }
}

export type TrainMode = "grow" | "pinned" | "data";

export interface TrainResult {
  mode: TrainMode;
  /** State to commit (only after a successful, latest-run pipeline pass). */
  state: ScaleState;
  /** Decoded domain: assignment order (grow/data) or explicit order (pinned). */
  domain: unknown[];
  /** Raw stored index for a value (NOT modded); undefined = unknown value. */
  indexOf(value: unknown): number | undefined;
  /** Resolved range entry (range[rawIndex % range.length]); undefined = unknown. */
  rangeValueOf(value: unknown): unknown;
  warnings: ScaleWarning[];
}

export function trainDiscrete(
  values: Iterable<unknown>,
  spec: DiscreteScaleSpec,
  prevState?: ScaleState | null,
): TrainResult {
  const fingerprint = paletteFingerprint(spec);
  const rangeSize = spec.range.length;
  const onExhaust = spec.onExhaust ?? "cycle";
  const warnings: ScaleWarning[] = [];

  // ---- pinned mode: explicit domain SUSPENDS stored assignments -----------
  if (spec.domain !== undefined) {
    const pinned = new Map<string, number>();
    for (const v of spec.domain) {
      const k = encodeKey(v);
      if (!pinned.has(k)) pinned.set(k, pinned.size);
    }
    if (pinned.size > rangeSize) {
      if (onExhaust === "error") {
        throw new PaletteExhaustedError(pinned.size, rangeSize);
      }
      warnings.push({
        code: "palette-exhausted",
        message: `Explicit domain has ${pinned.size} values for a range of ${rangeSize}; cycling.`,
      });
    }
    // Deduplicated out-of-domain notice.
    const unknownKeys = new Set<string>();
    for (const v of values) {
      const k = encodeKey(v);
      if (!pinned.has(k)) unknownKeys.add(k);
    }
    if (unknownKeys.size > 0) {
      const offenders = [...unknownKeys].map((k) => decodeKey(k));
      warnings.push({
        code: "out-of-domain",
        message: `${unknownKeys.size} data value(s) outside the explicit domain map to the 'unknown' output.`,
        values: offenders,
      });
    }
    // Stored assignments survive untouched; they restore when the explicit
    // domain is removed (fingerprint is re-checked at that point).
    const state = prevState ?? freshScaleState(fingerprint);
    return {
      mode: "pinned",
      state,
      domain: [...pinned.keys()].map((k) => decodeKey(k)),
      indexOf: (v) => pinned.get(encodeKey(v)),
      rangeValueOf: (v) => {
        const i = pinned.get(encodeKey(v));
        return i === undefined ? undefined : spec.range[i % rangeSize];
      },
      warnings,
    };
  }

  // ---- grow / data modes ---------------------------------------------------
  const mode: TrainMode = spec.domainMode === "data" ? "data" : "grow";

  let assignments = new Map<string, number>();
  let nextIndex = 0;
  let exhaustWarned = false;

  if (mode === "grow" && prevState !== undefined && prevState !== null) {
    if (prevState.version !== SCALE_STATE_VERSION) {
      warnings.push({
        code: "version-mismatch",
        message: `Stored scale state has schema version ${String(prevState.version)}; expected ${String(SCALE_STATE_VERSION)}. Starting fresh.`,
      });
    } else if (prevState.fingerprint === fingerprint) {
      assignments = new Map(prevState.assignments);
      nextIndex = prevState.nextIndex;
      exhaustWarned = prevState.exhaustWarned;
    } else {
      warnings.push({
        code: "fingerprint-mismatch",
        message:
          "Palette identity changed (scale type, scheme, or range values); stored assignments discarded.",
      });
    }
  }

  const present = new Set<string>();
  for (const v of values) {
    const k = encodeKey(v);
    present.add(k);
    if (assignments.has(k)) continue;
    if (nextIndex >= rangeSize) {
      if (onExhaust === "error") {
        throw new PaletteExhaustedError(nextIndex + 1, rangeSize);
      }
      if (!exhaustWarned) {
        exhaustWarned = true;
        warnings.push({
          code: "palette-exhausted",
          message:
            `More than ${rangeSize} discrete values; cycling the palette. ` +
            "Consider an explicit domain or a larger range. (Warned once.)",
        });
      }
    }
    assignments.set(k, nextIndex++);
  }

  const state: ScaleState = {
    version: SCALE_STATE_VERSION,
    fingerprint,
    assignments: [...assignments.entries()],
    nextIndex,
    exhaustWarned,
  };

  // The visible domain is only the values PRESENT in this render (a removed
  // series leaves the legend but keeps its assignment in state), ordered by
  // stored assignment index (i.e. global first-seen order).
  const domainKeys = [...present].toSorted((a, b) => assignments.get(a)! - assignments.get(b)!);

  return {
    mode,
    state,
    domain: domainKeys.map((k) => decodeKey(k)),
    indexOf: (v) => assignments.get(encodeKey(v)),
    rangeValueOf: (v) => {
      const i = assignments.get(encodeKey(v));
      return i === undefined ? undefined : spec.range[i % rangeSize];
    },
    warnings,
  };
}
