import type {
  CandidateFacts,
  CandidateGroup,
  CanonicalAxisToken,
  CellValue,
  RenderModel,
} from "@ggsvelte/core";

import type {
  InteractionSource,
  PlotDatum,
  PlotInspectionChange,
  ResolvedInspectMode,
} from "../interaction/interaction.js";
import { uniqueKeysFromRowIndexes } from "../selection/selection.js";

export interface ResolveInspectionInput<
  Row extends Record<string, CellValue>,
  Key extends PropertyKey,
> {
  readonly model: RenderModel;
  readonly seed: CandidateFacts;
  readonly mode: ResolvedInspectMode;
  readonly state: "transient" | "pinned";
  readonly source: InteractionSource;
  readonly keyOf: (row: Row, index: number) => Key | null;
}

export type InspectionSnapshotCompleteness = "transient" | "complete";

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

interface ResolvedTarget {
  readonly seed: CandidateFacts;
  readonly members: readonly CandidateFacts[];
  readonly group: CandidateGroup | null;
}

const PRESENTATION_ORDERING_VERSION = 1;
const TRANSIENT_MEMBER_LIMIT = 8;

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

function resolvedTarget(
  model: RenderModel,
  seed: CandidateFacts,
  mode: ResolvedInspectMode,
): ResolvedTarget | null {
  if (mode === "exact" || mode === "xy") return { seed, members: [seed], group: null };
  const group = model.candidates.group(seed.id, mode);
  if (group === null) return null;
  const members = [...group.memberIds]
    .map((id) => model.candidates.candidate(id))
    .filter((candidate): candidate is CandidateFacts => candidate !== null);
  return { seed, members: members.length === 0 ? [seed] : members, group };
}

function datum<Row extends Record<string, CellValue>, Key extends PropertyKey>(
  model: RenderModel,
  candidate: CandidateFacts,
  keyOf: (row: Row, index: number) => Key | null,
): PlotDatum<Row, Key> {
  const row = candidate.rowIndex === null ? null : (model.row(candidate.rowIndex) as Row | null);
  const key = row === null || candidate.rowIndex === null ? null : keyOf(row, candidate.rowIndex);
  // Set-based first-seen dedup (O(R)) — same pattern as selection helpers.
  // Array#includes here was O(R²) for large aggregate/stat lineages (#200).
  const sourceKeys = uniqueKeysFromRowIndexes(model.lineage.keys(candidate.lineage), (rowIndex) => {
    const source = model.row(rowIndex);
    if (source === null) return null;
    return keyOf(source as Row, rowIndex);
  }) as Key[];
  const fields = (model.layerFields[candidate.layerIndex] ?? []).map((field) => ({
    ...field,
    value:
      row?.[field.field] ??
      (row === null && field.channel === "x"
        ? candidate.xValue
        : row === null && field.channel === "y"
          ? candidate.yValue
          : null),
  }));
  return Object.freeze({
    key,
    row,
    sourceKeys: Object.freeze(sourceKeys),
    lineageCount: model.lineage.count(candidate.lineage),
    layerIndex: candidate.layerIndex,
    panelId: candidate.panelId,
    fields: Object.freeze(fields),
    anchor: Object.freeze({ x: candidate.x, y: candidate.y }),
  });
}

function axisLabel(model: RenderModel, mode: "x" | "y", value: CellValue): string {
  if (value === null) return "–";
  return model.axisFormatters[mode](value);
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
 * The only rich inspection constructor. Tooltip, crosshair, narration, and
 * callbacks all consume this immutable snapshot; none regroup independently.
 */
export function resolveInspection<Row extends Record<string, CellValue>, Key extends PropertyKey>(
  input: ResolveInspectionInput<Row, Key>,
): PlotInspectionChange<Row, Key> {
  const { model, seed, mode, state, source, keyOf } = input;
  const target = resolvedTarget(model, seed, mode);
  // The legacy direct constructor remains total for callers that already hold
  // a seed. Coordinated dominant-axis lookup rejects invalid buckets instead.
  if (target === null) {
    const single = datum<Row, Key>(model, seed, keyOf);
    return Object.freeze({
      type: "inspect",
      phase: "change",
      state,
      source,
      mode,
      panelId: seed.panelId,
      focus: single,
      members: [single] as const,
      axisValue: mode === "x" ? seed.xValue : seed.yValue,
      axisLabel: axisLabel(
        model,
        mode === "x" ? "x" : "y",
        mode === "x" ? seed.xValue : seed.yValue,
      ),
    });
  }
  return materializeInspection(input, target, "complete");
}

function materializeInspection<Row extends Record<string, CellValue>, Key extends PropertyKey>(
  input: ResolveInspectionInput<Row, Key>,
  target: ResolvedTarget,
  completeness: InspectionSnapshotCompleteness,
): PlotInspectionChange<Row, Key> {
  const { model, seed, mode, state, source, keyOf } = input;
  const single = datum<Row, Key>(model, seed, keyOf);
  if (mode === "exact" || mode === "xy") {
    return Object.freeze({
      type: "inspect",
      phase: "change",
      state,
      source,
      mode,
      panelId: seed.panelId,
      focus: single,
      members: [single] as const,
    });
  }

  const group = target.group!;
  const completeCandidates = target.members;
  const memberCandidates =
    completeness === "transient"
      ? completeCandidates.slice(0, TRANSIENT_MEMBER_LIMIT)
      : completeCandidates;
  const members = memberCandidates.map((candidate) => datum<Row, Key>(model, candidate, keyOf));
  const focusIndex = memberCandidates.findIndex((candidate) => candidate.id === group.focusId);
  const focus =
    focusIndex >= 0
      ? members[focusIndex]!
      : datum<Row, Key>(model, model.candidates.candidate(group.focusId) ?? seed, keyOf);
  const nonempty = (members.length === 0 ? [focus] : members) as [
    PlotDatum<Row, Key>,
    ...PlotDatum<Row, Key>[],
  ];
  return Object.freeze({
    type: "inspect",
    phase: "change",
    state,
    source,
    mode,
    panelId: seed.panelId,
    focus,
    members: Object.freeze(nonempty),
    axisValue: group.axisValue,
    axisLabel: axisLabel(model, mode, group.axisValue),
  });
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
    const semanticMembers = target.members.map((candidate) => {
      const row = candidate.rowIndex === null ? null : input.model.row(candidate.rowIndex);
      const key =
        row === null || candidate.rowIndex === null ? null : keyOf(row as Row, candidate.rowIndex);
      const fallback = `lineage:${input.model.lineage.keys(candidate.lineage).join(",")}`;
      const payload =
        row === null
          ? `${axisToken(candidate.xToken)},${axisToken(candidate.yToken)}`
          : Object.keys(row)
              .toSorted()
              .map((field) => `${field}=${cellToken(row[field] ?? null)}`)
              .join(",");
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
    const presentationIdentity = [
      epochToken(input.layoutEpoch),
      PRESENTATION_ORDERING_VERSION,
      range === undefined
        ? `candidate:${input.seed.id}`
        : `${range.axis}:${range.start}:${range.end}`,
      target.members.map((candidate) => `${candidate.id}@${candidate.x},${candidate.y}`).join(";"),
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
    if (prior.seedKey === null) {
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
        const logicalIdentity =
          candidate === null
            ? ""
            : `${axisToken(candidate.xToken)}|${axisToken(candidate.yToken)}|${input.model.lineage.keys(candidate.lineage).join(",")}`;
        if (
          candidate?.layerIndex === prior.layerIndex &&
          candidate.rowIndex === prior.seedRow &&
          candidate.kind === prior.seedKind &&
          candidateBatchRole(input.model, candidate) === prior.seedBatchRole &&
          candidate.primitiveIndex === prior.seedPrimitiveIndex &&
          logicalIdentity === prior.seedLogicalIdentity
        )
          matches.push(candidate);
      }
      seed = matches.length === 1 ? matches[0]! : null;
    } else {
      const matches: CandidateFacts[] = [];
      for (let id = 0; id < input.model.candidates.size; id++) {
        const candidate = input.model.candidates.candidate(id);
        if (candidate?.layerIndex !== prior.layerIndex || candidate.rowIndex === null) continue;
        const row = input.model.row(candidate.rowIndex);
        if (row !== null && keyOf(row as Row, candidate.rowIndex) === prior.seedKey)
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
