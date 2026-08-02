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

/**
 * Magnitude used to rank hover slots for high-n stacks (#1274).
 * Group by x → rank on |y|; group by y → rank on |x|. Non-numeric → 0.
 */
export function candidateValueMagnitude(candidate: CandidateFacts, groupAxis: "x" | "y"): number {
  const value = groupAxis === "x" ? candidate.yValue : candidate.xValue;
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value);
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? Math.abs(time) : 0;
  }
  return 0;
}

/**
 * Signed numeric contribution for stack totals (#1274). Non-numeric → null.
 */
export function candidateValueContribution(
  candidate: CandidateFacts,
  groupAxis: "x" | "y",
): number | null {
  const value = groupAxis === "x" ? candidate.yValue : candidate.xValue;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  return null;
}

/**
 * Sum of finite contributions across the full axis group (not the hover cap).
 * One value per `seriesId` (first-seen) so multi-layer compositions that paint
 * the same series twice (line+point, col+text) do not inflate the total (#1274).
 */
export function groupMagnitudeTotal(
  members: readonly CandidateFacts[],
  groupAxis: "x" | "y",
): number | null {
  const bySeries = new Map<number, number>();
  for (const member of members) {
    if (bySeries.has(member.seriesId)) continue;
    const contribution = candidateValueContribution(member, groupAxis);
    if (contribution === null) continue;
    bySeries.set(member.seriesId, contribution);
  }
  if (bySeries.size === 0) return null;
  let sum = 0;
  for (const value of bySeries.values()) sum += value;
  return sum;
}

/**
 * Select ≤ `limit` axis-group candidates for a transient hover snapshot (#1274).
 *
 * - When the group fits in the limit, preserve input (stack / series) order.
 * - When over the limit: force-include `focusId`, fill remaining slots with
 *   the largest |value| on the orthogonal axis, focus first then by magnitude.
 */
export function selectTransientMembers(
  members: readonly CandidateFacts[],
  focusId: number,
  options: {
    readonly groupAxis: "x" | "y";
    readonly limit?: number;
  },
): readonly CandidateFacts[] {
  const limit = options.limit ?? TRANSIENT_MEMBER_LIMIT;
  if (limit <= 0) return [];
  if (members.length <= limit) return members;

  const groupAxis = options.groupAxis;
  let focus: CandidateFacts | null = null;
  const others: CandidateFacts[] = [];
  for (const member of members) {
    if (member.id === focusId) focus = member;
    else others.push(member);
  }

  others.sort((left, right) => {
    const delta =
      candidateValueMagnitude(right, groupAxis) - candidateValueMagnitude(left, groupAxis);
    if (delta !== 0) return delta;
    // Stable-ish: lower candidate id wins ties (deterministic, not stack order).
    return left.id - right.id;
  });

  if (focus === null) {
    return others.slice(0, limit);
  }
  if (limit === 1) return [focus];
  return [focus, ...others.slice(0, limit - 1)];
}

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
  //
  // One slot of memo, because datum reads a member's own row for the gate and
  // then asks for its key by index — without this the legacy path would copy
  // that row twice. Distinct lineage indexes miss the slot and materialize as
  // they always did.
  let lastIndex = -1;
  let lastRow: Row | null = null;
  const keyAt = (index: number): Key | null => {
    if (index !== lastIndex) {
      lastIndex = index;
      lastRow = model.row(index) as Row | null;
    }
    return lastRow === null ? null : keyOf(lastRow, index);
  };
  const target = resolvedTarget(model, seed, mode);
  // The legacy direct constructor remains total for callers that already hold
  // a seed. Coordinated dominant-axis lookup rejects invalid buckets instead.
  if (target === null) {
    // resolvedTarget only returns null for axis modes when the group bucket
    // is missing; exact/xy always yield a single-member target.
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
    const axisValue = mode === "x" ? seed.xValue : seed.yValue;
    return Object.freeze({
      type: "inspect",
      phase: "change",
      state,
      source,
      mode,
      panelId: seed.panelId,
      focus: single,
      members: [single] as const,
      axisValue,
      axisLabel: axisLabel(model, mode, axisValue),
      groupTotal: candidateValueContribution(seed, mode),
      groupMemberCount: 1,
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
  const groupAxis: "x" | "y" = mode === "y" ? "y" : "x";
  const memberCandidates =
    completeness === "transient"
      ? selectTransientMembers(completeCandidates, group.focusId, {
          groupAxis,
          limit: TRANSIENT_MEMBER_LIMIT,
        })
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
    // Full-group total + size — independent of the hover cap so Total and
    // "+N more" stay honest when members were truncated (#1274).
    groupTotal: groupMagnitudeTotal(completeCandidates, groupAxis),
    groupMemberCount: completeCandidates.length,
  });
}

// ---------------------------------------------------------------------------
// Stable import path: re-export coordinator surface from this module.
// ---------------------------------------------------------------------------
export { clearInspectionFingerprint, createInspectionCoordinator } from "./coordinator.js";
