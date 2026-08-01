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
  keyAt: (index: number) => Key | null,
): PlotDatum<Row, Key> {
  const row = candidate.rowIndex === null ? null : (model.row(candidate.rowIndex) as Row | null);
  // The row gate stays: a member whose row does not resolve has no key, even
  // when the resolver would hand one back for that index.
  const key = row === null || candidate.rowIndex === null ? null : keyAt(candidate.rowIndex);
  // Set-based first-seen dedup (O(R)) — same pattern as selection helpers.
  // Array#includes here was O(R²) for large aggregate/stat lineages (#200).
  // Resolving by index keeps this O(R) lookups rather than O(R) row copies:
  // model.row rebuilds an object per call, and the key never needed it.
  const sourceKeys = uniqueKeysFromRowIndexes(
    model.lineage.keys(candidate.lineage),
    keyAt,
  ) as Key[];
  const candidateValue = (channel: string): CellValue => {
    switch (channel) {
      case "x":
        return candidate.xValue;
      case "y":
        return candidate.yValue;
      case "size":
        return candidate.sizeValue;
      case "linewidth":
        return candidate.linewidthValue;
      case "alpha":
        return candidate.alphaValue;
      case "shape":
        return candidate.shapeValue;
      case "linetype":
        return candidate.linetypeValue;
      default:
        return null;
    }
  };
  const fields = (model.layerFields[candidate.layerIndex] ?? []).map((field) => ({
    ...field,
    value: row?.[field.field] ?? (row === null ? candidateValue(field.channel) : null),
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
  // This entry point takes a row-shaped keyOf, so it materializes each row to
  // ask for its key. The coordinated path passes an index-keyed resolver and
  // skips that entirely.
  const keyAt = (index: number): Key | null => {
    const row = model.row(index) as Row | null;
    return row === null ? null : keyOf(row, index);
  };
  const target = resolvedTarget(model, seed, mode);
  // The legacy direct constructor remains total for callers that already hold
  // a seed. Coordinated dominant-axis lookup rejects invalid buckets instead.
  if (target === null) {
    const single = datum<Row, Key>(model, seed, keyAt);
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
  return materializeInspection(input, target, "complete", keyAt);
}

/** Package-internal: coordinator reuses the same materialize path as resolve. */
export function materializeInspection<
  Row extends Record<string, CellValue>,
  Key extends PropertyKey,
>(
  /** keyOf is deliberately absent: keys arrive through `keyAt`. */
  input: Omit<ResolveInspectionInput<Row, Key>, "keyOf">,
  target: ResolvedTarget,
  completeness: InspectionSnapshotCompleteness,
  /** Source-row key by index. The coordinated path passes its own index-keyed
   * bag; resolveInspection passes an adapter over its row-shaped keyOf. */
  keyAt: (index: number) => Key | null,
): PlotInspectionChange<Row, Key> {
  const { model, seed, mode, state, source } = input;
  const single = datum<Row, Key>(model, seed, keyAt);
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
  const members = memberCandidates.map((candidate) => datum<Row, Key>(model, candidate, keyAt));
  const focusIndex = memberCandidates.findIndex((candidate) => candidate.id === group.focusId);
  const focus =
    focusIndex >= 0
      ? members[focusIndex]!
      : datum<Row, Key>(model, model.candidates.candidate(group.focusId) ?? seed, keyAt);
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
export { clearInspectionFingerprint, createInspectionCoordinator } from "./coordinator.js";
