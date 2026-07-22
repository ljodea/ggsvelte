/**
 * Pure inspection snapshot materialization.
 *
 * Builds immutable PlotInspectionChange snapshots from a seed candidate.
 * The two-slot coordinator (fingerprints, pin rebind, memo) lives in
 * `./coordinator.ts` and is re-exported below for the stable `resolver.js`
 * import path used by production + tests.
 */
import type { CandidateFacts, CandidateGroup, CellValue, RenderModel } from "@ggsvelte/core";

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

export interface ResolvedTarget {
  readonly seed: CandidateFacts;
  readonly members: readonly CandidateFacts[];
  readonly group: CandidateGroup | null;
}

/**
 * Shared with the coordinator so transient fingerprint windows match
 * materialize's member cap (single source — do not duplicate the literal).
 */
export const TRANSIENT_MEMBER_LIMIT = 8;

export function resolvedTarget(
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

/** Package-internal: coordinator reuses the same materialize path as resolve. */
export function materializeInspection<
  Row extends Record<string, CellValue>,
  Key extends PropertyKey,
>(
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

// ---------------------------------------------------------------------------
// Stable import path: re-export coordinator surface from this module.
// ---------------------------------------------------------------------------
export {
  clearInspectionFingerprint,
  createInspectionCoordinator,
  type CoordinatedInspection,
  type CoordinatedInspectionInput,
} from "./coordinator.js";
