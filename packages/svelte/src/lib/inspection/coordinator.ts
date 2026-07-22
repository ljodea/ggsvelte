/**
 * Inspection coordinator: two-slot memo (transient + pinned), semantic /
 * presentation fingerprints, and pin rebind across layout/identity epochs.
 *
 * Snapshot materialization lives in `./resolver.ts`. This module owns identity
 * tokens, cache keys, and the mutable coordinator factory only.
 */
import type { CandidateFacts, CanonicalAxisToken, CellValue, RenderModel } from "@ggsvelte/core";

import type {
  InteractionSource,
  PlotInspectionChange,
  ResolvedInspectMode,
} from "../interaction/interaction.js";
import {
  materializeInspection,
  resolvedTarget,
  TRANSIENT_MEMBER_LIMIT,
  type InspectionSnapshotCompleteness,
  type ResolveInspectionInput,
} from "./resolver.js";

export interface CoordinatedInspectionInput<
  Row extends Record<string, CellValue>,
  Key extends PropertyKey,
> extends ResolveInspectionInput<Row, Key> {
  /** Changes only when source identity/order changes, never for layout-only renders. */
  readonly identityEpoch: PropertyKey;
  /** Changes whenever layout/geometry changes. */
  readonly layoutEpoch: PropertyKey;
  /** Complete is required for pins, custom content, and public callbacks. */
  readonly completeness?: InspectionSnapshotCompleteness;
}

export interface CoordinatedInspection<Row, Key> {
  /** Internal seed retained by the chart-local coordinator, never emitted. */
  readonly seed: CandidateFacts;
  readonly snapshot: PlotInspectionChange<Row, Key>;
  readonly semanticFingerprint: string;
  readonly presentationIdentity: string;
  readonly semanticChanged: boolean;
  readonly presentationChanged: boolean;
}

/**
 * Stable emit-dedupe token for inspection clear events.
 * Non-clear emissions must use the coordinator's `semanticFingerprint`
 * (type-aware key identity); hosts must not invent a second fingerprint.
 */
export function clearInspectionFingerprint(source: InteractionSource): string {
  return `clear:${source}`;
}

const PRESENTATION_ORDERING_VERSION = 1;

function axisToken(token: CanonicalAxisToken | null): string {
  if (token === null) return "invalid";
  return `${token.kind}:${String(token.value)}`;
}

function cellToken(value: CellValue): string {
  if (value === null) return "null";
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (typeof value === "number") return `number:${Object.is(value, -0) ? 0 : value}`;
  return `${typeof value}:${String(value)}`;
}

/**
 * Stable cell payload for semantic fingerprints. Insertion order of Object.keys
 * is used (no O(F log F) sort): same row object is stable; content-equal clones
 * with different key order may re-emit (safe over-emit, not under-emit).
 */
function rowCellPayload(row: Record<string, CellValue>): string {
  const parts: string[] = [];
  for (const field of Object.keys(row)) {
    parts.push(`${field}=${cellToken(row[field] ?? null)}`);
  }
  return parts.join(",");
}

/** Stable role within one layer's batches of the same geometry kind. Absolute
 * scene batch indices can shift when unrelated layers change, while this role
 * still distinguishes composite pieces such as a smooth ribbon/line or a
 * boxplot's whisker/median segments. */
function candidateBatchRole(model: RenderModel, candidate: CandidateFacts): string {
  let ordinal = 0;
  for (let index = 0; index <= candidate.batchIndex; index++) {
    const batch = model.scene.batches[index];
    if (batch?.layerIndex !== candidate.layerIndex || batch.kind !== candidate.kind) continue;
    if (index === candidate.batchIndex) return `${candidate.kind}:${ordinal}`;
    ordinal++;
  }
  return `${candidate.kind}:missing`;
}

/**
 * Internal adapter coordinator. It owns exactly one transient and one pinned
 * immutable snapshot; replacement, release, and invalidation drop references
 * immediately instead of growing a scene-wide rich-object cache.
 */
export function createInspectionCoordinator<
  Row extends Record<string, CellValue>,
  Key extends PropertyKey,
>(keyOf: (row: Row, index: number) => Key | null) {
  type Slot = Readonly<{
    key: string;
    value: CoordinatedInspection<Row, Key>;
    /** Candidate id at pin time — O(1) rebind when identityEpoch is unchanged. */
    seedId: number;
    seedKey: Key | null;
    seedRow: number | null;
    seedKind: CandidateFacts["kind"];
    seedBatchRole: string;
    seedPrimitiveIndex: number;
    seedLogicalIdentity: string;
    layerIndex: number;
    identityEpoch: PropertyKey;
    mode: ResolvedInspectMode;
  }>;
  let transient: Slot | null = null;
  let pinned: Slot | null = null;
  let lastSemanticFingerprint: string | null = null;
  let lastPresentationIdentity: string | null = null;
  let lastSlot: "transient" | "pinned" | null = null;
  const symbolIds = new Map<symbol, number>();
  const epochIds = new Map<symbol, number>();
  const epochToken = (value: PropertyKey): string => {
    if (typeof value !== "symbol") return `${typeof value}:${String(value)}`;
    let id = epochIds.get(value);
    if (id === undefined) {
      id = epochIds.size;
      epochIds.set(value, id);
    }
    return `symbol:${id}`;
  };
  const semanticKeyToken = (key: PropertyKey | null, fallback: string): string => {
    if (key === null) return fallback;
    if (typeof key === "symbol") {
      let id = symbolIds.get(key);
      if (id === undefined) {
        id = symbolIds.size;
        symbolIds.set(key, id);
      }
      return `symbol:${id}`;
    }
    return `${typeof key}:${String(key)}`;
  };

  const resolve = (
    input: Omit<CoordinatedInspectionInput<Row, Key>, "keyOf">,
  ): CoordinatedInspection<Row, Key> | null => {
    const target = resolvedTarget(input.model, input.seed, input.mode);
    if (target === null) return null;
    const completeness =
      input.state === "pinned" ? "complete" : (input.completeness ?? "transient");
    // Pin/complete fingerprints the full group; transient matches materialize's
    // TRANSIENT_MEMBER_LIMIT so pointer inspect is O(min(M,8)·F), not O(M·F log F).
    const fingerprintMembers =
      completeness === "complete"
        ? target.members
        : target.members.slice(0, TRANSIENT_MEMBER_LIMIT);
    const semanticMembers = fingerprintMembers.map((candidate) => {
      const row = candidate.rowIndex === null ? null : input.model.row(candidate.rowIndex);
      const key =
        row === null || candidate.rowIndex === null ? null : keyOf(row as Row, candidate.rowIndex);
      const fallback = `lineage:${input.model.lineage.keys(candidate.lineage).join(",")}`;
      const payload =
        row === null
          ? `${axisToken(candidate.xToken)},${axisToken(candidate.yToken)}`
          : rowCellPayload(row);
      return `${semanticKeyToken(key, fallback)}{${payload}}`;
    });
    const focusRow = input.seed.rowIndex === null ? null : input.model.row(input.seed.rowIndex);
    const focusKey =
      focusRow === null || input.seed.rowIndex === null
        ? null
        : keyOf(focusRow as Row, input.seed.rowIndex);
    const focusIdentity = semanticKeyToken(
      focusKey,
      `lineage:${input.model.lineage.keys(input.seed.lineage).join(",")}`,
    );
    const logicalToken =
      input.mode === "x"
        ? axisToken(input.seed.xToken)
        : input.mode === "y"
          ? axisToken(input.seed.yToken)
          : `${axisToken(input.seed.xToken)}|${axisToken(input.seed.yToken)}`;
    const semanticFingerprint = [
      input.mode,
      input.seed.panelId,
      logicalToken,
      focusIdentity,
      semanticMembers.join(";"),
      input.state,
    ].join("|");
    const range = target.group?.range;
    // Mirror fingerprintMembers: transient pinches presentation id to the same
    // member window as materialize (layoutEpoch + range already cover the bucket).
    const presentationMembers = fingerprintMembers;
    const presentationIdentity = [
      epochToken(input.layoutEpoch),
      PRESENTATION_ORDERING_VERSION,
      range === undefined
        ? `candidate:${input.seed.id}`
        : `${range.axis}:${range.start}:${range.end}`,
      presentationMembers
        .map((candidate) => `${candidate.id}@${candidate.x},${candidate.y}`)
        .join(";"),
    ].join("|");
    const cacheKey = `${epochToken(input.layoutEpoch)}|${presentationIdentity}|${semanticFingerprint}|${completeness}|${input.source}`;
    const current = input.state === "pinned" ? pinned : transient;
    if (current?.key === cacheKey) return current.value;
    const snapshot = materializeInspection({ ...input, keyOf }, target, completeness);
    const value = Object.freeze({
      seed: input.seed,
      snapshot,
      semanticFingerprint,
      presentationIdentity,
      semanticChanged: semanticFingerprint !== lastSemanticFingerprint,
      presentationChanged: presentationIdentity !== lastPresentationIdentity,
    });
    const slot: Slot = {
      key: cacheKey,
      value,
      seedId: input.seed.id,
      seedKey: focusKey,
      seedRow: input.seed.rowIndex,
      seedKind: input.seed.kind,
      seedBatchRole: candidateBatchRole(input.model, input.seed),
      seedPrimitiveIndex: input.seed.primitiveIndex,
      seedLogicalIdentity: `${axisToken(input.seed.xToken)}|${axisToken(input.seed.yToken)}|${input.model.lineage.keys(input.seed.lineage).join(",")}`,
      layerIndex: input.seed.layerIndex,
      identityEpoch: input.identityEpoch,
      mode: input.mode,
    };
    if (input.state === "pinned") pinned = slot;
    else transient = slot;
    lastSemanticFingerprint = semanticFingerprint;
    lastPresentationIdentity = presentationIdentity;
    lastSlot = input.state === "pinned" ? "pinned" : "transient";
    return value;
  };

  /** Keyless pin match: cheap filters then O(L) logical identity (#229). */
  const keylessPinMatch = (model: RenderModel, prior: Slot, candidate: CandidateFacts): boolean => {
    if (candidate.layerIndex !== prior.layerIndex) return false;
    if (candidate.rowIndex !== prior.seedRow) return false;
    if (candidate.kind !== prior.seedKind) return false;
    if (candidate.primitiveIndex !== prior.seedPrimitiveIndex) return false;
    if (candidateBatchRole(model, candidate) !== prior.seedBatchRole) return false;
    const logicalIdentity = `${axisToken(candidate.xToken)}|${axisToken(candidate.yToken)}|${model.lineage.keys(candidate.lineage).join(",")}`;
    return logicalIdentity === prior.seedLogicalIdentity;
  };

  /** Keyed pin match: layer + non-null row whose keyOf equals the pinned key. */
  const keyedPinMatch = (model: RenderModel, prior: Slot, candidate: CandidateFacts): boolean => {
    if (candidate.layerIndex !== prior.layerIndex || candidate.rowIndex === null) return false;
    const row = model.row(candidate.rowIndex);
    return row !== null && keyOf(row as Row, candidate.rowIndex) === prior.seedKey;
  };

  /**
   * Strict keyed rebind for the seedId fast path: key match plus kind / batch
   * role / primitive (same filters as multi-match disambiguation). Same-epoch
   * is not always pure layout — layer-prop swaps can keep the identity token
   * while changing primitives that reuse an id (Codex #272 P2).
   */
  const keyedPinRoleMatch = (model: RenderModel, prior: Slot, candidate: CandidateFacts): boolean =>
    keyedPinMatch(model, prior, candidate) &&
    candidate.kind === prior.seedKind &&
    candidate.primitiveIndex === prior.seedPrimitiveIndex &&
    candidateBatchRole(model, candidate) === prior.seedBatchRole;

  const reconcilePinned = (
    input: Readonly<{
      model: RenderModel;
      identityEpoch: PropertyKey;
      layoutEpoch: PropertyKey;
      source?: InteractionSource;
      completeness?: InspectionSnapshotCompleteness;
    }>,
  ): CoordinatedInspection<Row, Key> | null => {
    const prior = pinned;
    if (prior === null) return null;
    let seed: CandidateFacts | null = null;
    // Same identityEpoch: O(1) seedId revalidation when id + role still match.
    // Keyed path requires kind/batch/primitive (not only layer+key) so geom
    // swaps that reuse seedId cannot pin the wrong primitive. Fall through to
    // full scan on miss. Identity-change keyed still full-scans for ambiguity;
    // keyless identity-change clears immediately below.
    if (prior.identityEpoch === input.identityEpoch) {
      const preferred = input.model.candidates.candidate(prior.seedId);
      if (preferred !== null) {
        if (prior.seedKey === null) {
          if (keylessPinMatch(input.model, prior, preferred)) seed = preferred;
        } else if (keyedPinRoleMatch(input.model, prior, preferred)) {
          seed = preferred;
        }
      }
    }
    if (seed === null && prior.seedKey === null) {
      if (prior.identityEpoch !== input.identityEpoch) {
        pinned = null;
        if (lastSlot === "pinned") {
          lastSemanticFingerprint = null;
          lastPresentationIdentity = null;
          lastSlot = null;
        }
        return null;
      }
      const matches: CandidateFacts[] = [];
      for (let id = 0; id < input.model.candidates.size; id++) {
        const candidate = input.model.candidates.candidate(id);
        if (candidate === null) continue;
        if (!keylessPinMatch(input.model, prior, candidate)) continue;
        matches.push(candidate);
      }
      seed = matches.length === 1 ? matches[0]! : null;
    } else if (seed === null) {
      const matches: CandidateFacts[] = [];
      for (let id = 0; id < input.model.candidates.size; id++) {
        const candidate = input.model.candidates.candidate(id);
        if (candidate === null) continue;
        if (!keyedPinMatch(input.model, prior, candidate)) continue;
        matches.push(candidate);
      }
      if (matches.length === 1) seed = matches[0]!;
      else if (matches.length > 1) {
        const sourceRows = new Set(matches.map((candidate) => candidate.rowIndex));
        if (sourceRows.size === 1) {
          const sameRole = matches.filter(
            (candidate) =>
              candidate.kind === prior.seedKind &&
              candidateBatchRole(input.model, candidate) === prior.seedBatchRole &&
              candidate.primitiveIndex === prior.seedPrimitiveIndex,
          );
          seed = sameRole.length === 1 ? sameRole[0]! : null;
        }
      }
    }
    if (seed === null) {
      pinned = null;
      if (lastSlot === "pinned") {
        lastSemanticFingerprint = null;
        lastPresentationIdentity = null;
        lastSlot = null;
      }
      return null;
    }
    return resolve({
      model: input.model,
      seed,
      mode: prior.mode,
      state: "pinned",
      source: input.source ?? "programmatic",
      identityEpoch: input.identityEpoch,
      layoutEpoch: input.layoutEpoch,
      completeness: input.completeness ?? "complete",
    });
  };

  return {
    resolve,
    reconcilePinned,
    release(slot: "transient" | "pinned"): void {
      if (slot === "transient") transient = null;
      else pinned = null;
      if (lastSlot === slot) {
        lastSemanticFingerprint = null;
        lastPresentationIdentity = null;
        lastSlot = null;
      }
    },
    invalidate(): void {
      transient = null;
      pinned = null;
      lastSemanticFingerprint = null;
      lastPresentationIdentity = null;
      lastSlot = null;
      symbolIds.clear();
      epochIds.clear();
    },
    get memoSize(): number {
      return Number(transient !== null) + Number(pinned !== null);
    },
  };
}
