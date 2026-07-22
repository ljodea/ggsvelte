import { pathSubpathIndex } from "./candidate-geometry.js";
import type { GeometryBatch } from "./scene.js";

/** Semantic source-row keys associated with one renderer candidate. */
export interface SemanticCandidateKeys<Key extends PropertyKey = PropertyKey> {
  readonly batchIndex: number;
  /** A mark index, or a vertex index for path batches. */
  readonly primitiveIndex: number;
  readonly keys: readonly Key[];
}

/** Read-only focus projection for the renderer-level primitives in one batch. */
export interface BatchInteractionMask {
  readonly primitiveCount: number;
  readonly focusedCount: number;
  isFocused(primitiveIndex: number): boolean;
}

/** An encoded legend value and the distinct semantic row keys it represents. */
export interface LegendValueMembership<Key extends PropertyKey = PropertyKey> {
  readonly value: unknown;
  readonly keys: readonly Key[];
}

function primitiveCount(batch: GeometryBatch): number {
  if (batch.kind === "paths") return Math.max(0, batch.pathOffsets.length - 1);
  return batch.rowIndex.length;
}

function pathForVertex(offsets: Uint32Array, vertexIndex: number): number | null {
  if (
    !Number.isInteger(vertexIndex) ||
    vertexIndex < 0 ||
    offsets.length < 2 ||
    vertexIndex >= offsets.at(-1)!
  )
    return null;
  return pathSubpathIndex(offsets, vertexIndex);
}

function rendererPrimitive(batch: GeometryBatch, candidateIndex: number): number | null {
  if (batch.kind === "paths") return pathForVertex(batch.pathOffsets, candidateIndex);
  const count = primitiveCount(batch);
  return Number.isInteger(candidateIndex) && candidateIndex >= 0 && candidateIndex < count
    ? candidateIndex
    : null;
}

function freezeMasks(
  batches: readonly GeometryBatch[],
  focused: Map<number, Uint8Array>,
): ReadonlyArray<BatchInteractionMask | null> {
  const masks = batches.map<BatchInteractionMask | null>((_, batchIndex) => {
    const values = focused.get(batchIndex);
    if (values === undefined) return null;
    let focusedCount = 0;
    for (const value of values) focusedCount += value;
    return Object.freeze({
      primitiveCount: values.length,
      focusedCount,
      isFocused(primitiveIndex: number): boolean {
        return values[primitiveIndex] === 1;
      },
    });
  });
  return Object.freeze(masks);
}

function markFocusedPrimitive(
  focused: Map<number, Uint8Array>,
  batches: readonly GeometryBatch[],
  batchIndex: number,
  candidatePrimitiveIndex: number,
): void {
  const batch = batches[batchIndex];
  if (batch === undefined) return;
  const primitiveIndex = rendererPrimitive(batch, candidatePrimitiveIndex);
  if (primitiveIndex === null) return;
  let values = focused.get(batchIndex);
  if (values === undefined) {
    values = new Uint8Array(primitiveCount(batch));
    focused.set(batchIndex, values);
  }
  values[primitiveIndex] = 1;
}

/** Renderer primitive address for direct (keyless) inspection focus. */
export interface FocusedPrimitive {
  readonly batchIndex: number;
  readonly primitiveIndex: number;
}

/**
 * Project semantic emphasis keys onto renderer primitives without exposing a
 * mutable backing array. Batches without semantic candidates remain `null`,
 * so annotation-only geometry is not inadvertently de-emphasized.
 */
export function buildInteractionMasks<Key extends PropertyKey>(
  batches: readonly GeometryBatch[],
  emphasisKeys: Iterable<Key>,
  candidates: Iterable<SemanticCandidateKeys<Key>>,
): ReadonlyArray<BatchInteractionMask | null> {
  const emphasis = new Set(emphasisKeys);
  if (emphasis.size === 0)
    return Object.freeze(Array.from<null>({ length: batches.length }).fill(null));

  const focused = new Map<number, Uint8Array>();
  for (const candidate of candidates) {
    if (candidate.keys.length === 0) continue;
    const batch = batches[candidate.batchIndex];
    if (batch === undefined) continue;
    const primitiveIndex = rendererPrimitive(batch, candidate.primitiveIndex);
    if (primitiveIndex === null) continue;

    // Allocate the batch mask whenever a candidate is addressable so
    // non-matching emphasis still yields focusedCount 0 (not a null mask).
    let values = focused.get(candidate.batchIndex);
    if (values === undefined) {
      values = new Uint8Array(primitiveCount(batch));
      focused.set(candidate.batchIndex, values);
    }
    if (candidate.keys.some((key) => emphasis.has(key))) values[primitiveIndex] = 1;
  }

  return freezeMasks(batches, focused);
}

/**
 * Build focus masks from explicit renderer primitives (no semantic keys).
 * Used for rect inspection de-emphasis when the chart has no datum keys (#386).
 */
export function buildPrimitiveInteractionMasks(
  batches: readonly GeometryBatch[],
  primitives: Iterable<FocusedPrimitive>,
): ReadonlyArray<BatchInteractionMask | null> {
  const focused = new Map<number, Uint8Array>();
  let any = false;
  for (const primitive of primitives) {
    any = true;
    markFocusedPrimitive(focused, batches, primitive.batchIndex, primitive.primitiveIndex);
  }
  if (!any) return Object.freeze(Array.from<null>({ length: batches.length }).fill(null));
  return freezeMasks(batches, focused);
}

/** Typed canonical equality for raw discrete legend values. */
export function legendValueEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date)
    return a instanceof Date && b instanceof Date && Object.is(a.getTime(), b.getTime());
  return (
    a === b ||
    (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b))
  );
}

/** Resolve a raw legend value to stable semantic keys, preserving source order. */
export function resolveLegendFocusKeys<Key extends PropertyKey>(
  value: unknown,
  memberships: readonly LegendValueMembership<Key>[],
): readonly Key[] {
  const seen = new Set<Key>();
  const keys: Key[] = [];
  for (const membership of memberships) {
    if (!legendValueEqual(value, membership.value)) continue;
    for (const key of membership.keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return Object.freeze(keys);
}
