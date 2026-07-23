import { pathSubpathIndex, renderPrimitiveCount } from "./candidate-geometry.js";
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
  const count = renderPrimitiveCount(batch);
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

/**
 * Mark a **renderer** primitive index as focused (not a candidate vertex index).
 * Path callers must pass a subpath index; do not run path-vertex remapping here.
 */
function markFocusedPrimitive(
  focused: Map<number, Uint8Array>,
  batches: readonly GeometryBatch[],
  batchIndex: number,
  primitiveIndex: number,
): void {
  const batch = batches[batchIndex];
  if (batch === undefined) return;
  const count = renderPrimitiveCount(batch);
  if (!Number.isInteger(primitiveIndex) || primitiveIndex < 0 || primitiveIndex >= count) return;
  let values = focused.get(batchIndex);
  if (values === undefined) {
    values = new Uint8Array(count);
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
 * so pure annotation-only geometry is not inadvertently de-emphasized —
 * except presentation-only path batches (`candidates: false`) that share a
 * layer with a focused batch (ribbon outlines), which mirror that layer's mask
 * so unselected outlines mute with their fill.
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
      values = new Uint8Array(renderPrimitiveCount(batch));
      focused.set(candidate.batchIndex, values);
    }
    if (candidate.keys.some((key) => emphasis.has(key))) values[primitiveIndex] = 1;
  }

  // Mirror fill-batch focus onto presentation-only path batches on the same
  // layer (ribbon outline open paths). Null masks stay fully opaque in canvas.
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    if (batch === undefined || batch.kind !== "paths" || batch.candidates !== false) continue;
    if (focused.has(index)) continue;
    let source: Uint8Array | undefined;
    let sourceCount = 0;
    for (let other = 0; other < batches.length; other++) {
      if (other === index) continue;
      const peer = batches[other];
      if (peer === undefined || peer.layerIndex !== batch.layerIndex) continue;
      const values = focused.get(other);
      if (values === undefined) continue;
      source = values;
      sourceCount = renderPrimitiveCount(peer);
      break;
    }
    if (source === undefined) continue;
    const outlineCount = renderPrimitiveCount(batch);
    const mirrored = new Uint8Array(outlineCount);
    if (outlineCount === sourceCount) {
      mirrored.set(source);
    } else if (sourceCount > 0 && outlineCount === sourceCount * 2) {
      // outline: "both" — two open subpaths per closed fill run
      for (let path = 0; path < sourceCount; path++) {
        const bit = source[path]!;
        mirrored[path * 2] = bit;
        mirrored[path * 2 + 1] = bit;
      }
    } else if (sourceCount > 0) {
      // Length mismatch: mute all outline primitives under any active emphasis.
      // (zeros = not focused → canvas draws at mutedAlpha)
    }
    focused.set(index, mirrored);
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
