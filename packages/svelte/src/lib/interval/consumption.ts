import { cellToNumber, encodeKey, type CellValue } from "@ggsvelte/core";

import type {
  PlotInteractionInterval,
  ReadonlyIntervalDomains,
  SemanticIntervalAxis,
} from "../interaction/interaction.js";

/** The stable identity surface needed to decide whether stored state is live. */
interface IntervalConsumptionPanel {
  readonly id: string;
}

/** A semantic candidate projection; no render, pixel, or model state leaks in. */
export interface IntervalConsumptionCandidate<Key extends PropertyKey> {
  readonly panelId: string;
  readonly xValue?: CellValue;
  readonly yValue?: CellValue;
  readonly keys: readonly Key[];
}

export interface ConsumeIntervalKeysInput<Key extends PropertyKey> {
  readonly records: readonly PlotInteractionInterval<Key>[];
  readonly panels: readonly IntervalConsumptionPanel[];
  readonly candidates: readonly IntervalConsumptionCandidate<Key>[];
}

export interface RecomputePanelIntervalKeysInput<Key extends PropertyKey> {
  readonly panelId: string;
  readonly domains: ReadonlyIntervalDomains;
  readonly candidates: readonly IntervalConsumptionCandidate<Key>[];
}

/**
 * Candidate bag for a single-pass panel recompute: consumption fields plus
 * optional source-row indexes (lineage ∪ rowIndex) for lineageCount.
 */
type PanelIntervalProjectionCandidate<Key extends PropertyKey> =
  IntervalConsumptionCandidate<Key> & {
    readonly sourceRows?: Iterable<number>;
  };

export interface RecomputePanelIntervalProjectionInput<Key extends PropertyKey> {
  readonly panelId: string;
  readonly domains: ReadonlyIntervalDomains;
  readonly candidates: readonly PanelIntervalProjectionCandidate<Key>[];
}

function numericAxisContains(axis: SemanticIntervalAxis, value: CellValue): boolean {
  if (axis.kind === "band") return false;
  const numeric = cellToNumber(value);
  if (!Number.isFinite(numeric)) return false;
  if (axis.kind === "log" && numeric <= 0) return false;
  return numeric >= axis.domain[0] && numeric <= axis.domain[1];
}

/**
 * Build a membership predicate for one axis. Band axes precompute a Set so
 * multi-candidate scans are O(C + V) rather than O(C × V) via includes().
 */
function prepareAxisContains(
  axis: SemanticIntervalAxis,
): (value: CellValue | undefined) => boolean {
  if (axis.kind === "band") {
    // Indexed lookup: high-cardinality categoricals can hold thousands of
    // selected values, and a linear includes() per candidate is quadratic.
    const bandKeys = new Set(axis.values);
    return (value) => value !== undefined && bandKeys.has(encodeKey(value));
  }
  return (value) => value !== undefined && numericAxisContains(axis, value);
}

/**
 * Precompute axis membership (band Sets once) for multi-candidate scans.
 * Hot paths — cross-panel consumption, panel recompute, lineage counts —
 * must call this once per domains object, then test each candidate.
 */
export function prepareCandidateInInterval(
  domains: ReadonlyIntervalDomains,
): (candidate: Pick<IntervalConsumptionCandidate<PropertyKey>, "xValue" | "yValue">) => boolean {
  const xContains = domains.x === undefined ? undefined : prepareAxisContains(domains.x);
  const yContains = domains.y === undefined ? undefined : prepareAxisContains(domains.y);
  return (candidate) =>
    (xContains === undefined || xContains(candidate.xValue)) &&
    (yContains === undefined || yContains(candidate.yValue));
}

export function candidateInInterval(
  candidate: Pick<IntervalConsumptionCandidate<PropertyKey>, "xValue" | "yValue">,
  domains: ReadonlyIntervalDomains,
): boolean {
  return prepareCandidateInInterval(domains)(candidate);
}

function uniqueKeys<Key extends PropertyKey>(candidates: Iterable<readonly Key[]>): readonly Key[] {
  const keys = new Set<Key>();
  for (const candidateKeys of candidates) for (const key of candidateKeys) keys.add(key);
  return Object.freeze([...keys]);
}

/**
 * Consume controller interval records against the currently rendered panels.
 *
 * Independent and union records retain their committed source-row keys, but
 * dormant records for absent panels do not affect the current chart. A
 * cross-panel record instead projects its semantic domains into every visible
 * candidate, so free/reordered panels never depend on origin pixels.
 */
export function consumeIntervalKeys<Key extends PropertyKey>(
  input: ConsumeIntervalKeysInput<Key>,
): readonly Key[] {
  const preset = input.records[0]?.preset;
  if (preset === undefined) return Object.freeze([]);
  const visiblePanels = new Set(input.panels.map((panel) => panel.id));

  if (preset === "independent") {
    // Index candidates once by panelId so multi-record independent brushes
    // scan only that panel's candidates (O(C + R·c_panel)), not the full
    // store per record (O(R·C)).
    const candidatesByPanel = new Map<string, IntervalConsumptionCandidate<Key>[]>();
    for (const candidate of input.candidates) {
      const list = candidatesByPanel.get(candidate.panelId);
      if (list === undefined) candidatesByPanel.set(candidate.panelId, [candidate]);
      else list.push(candidate);
    }
    return uniqueKeys(
      input.records
        .filter((record) => record.preset === "independent" && visiblePanels.has(record.panelId))
        .flatMap((record) => {
          // Indexed lookup: a persistent brush can hold tens of thousands of
          // keys, and a linear includes() per candidate key is quadratic.
          const recordKeys = new Set<Key>(record.keys);
          const panelCandidates = candidatesByPanel.get(record.panelId);
          if (panelCandidates === undefined) return [];
          return panelCandidates.map((candidate) =>
            candidate.keys.filter((key) => recordKeys.has(key)),
          );
        }),
    );
  }

  if (preset === "union") {
    return uniqueKeys(
      input.records
        .filter((record) => record.preset === preset && visiblePanels.has(record.panelId))
        .map((record) => record.keys),
    );
  }

  const origin = input.records.find((record) => record.preset === "cross-panel");
  if (origin === undefined) return Object.freeze([]);
  // Band Sets are built once for the origin domains, not per candidate.
  const inInterval = prepareCandidateInInterval(origin.domains);
  return uniqueKeys(
    input.candidates
      .filter((candidate) => visiblePanels.has(candidate.panelId) && inInterval(candidate))
      .map((candidate) => candidate.keys),
  );
}

function sameIntervalAxis(
  left: SemanticIntervalAxis | undefined,
  right: SemanticIntervalAxis | undefined,
): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined || left.kind !== right.kind) return false;
  if (left.kind === "band" || right.kind === "band") {
    return (
      left.kind === "band" &&
      right.kind === "band" &&
      left.values.length === right.values.length &&
      left.values.every((value, index) => value === right.values[index])
    );
  }
  return Object.is(left.domain[0], right.domain[0]) && Object.is(left.domain[1], right.domain[1]);
}

/**
 * Semantic-content equality between a locally committed record and a record
 * observed in the interval set. Keys compare as sets because the controller
 * canonicalizes (sorts and de-duplicates) key order on storage; band values
 * compare in order because both sides derive from the scale's domain order.
 */
export function sameIntervalRecord<Key extends PropertyKey>(
  left: PlotInteractionInterval<Key> | null,
  right: PlotInteractionInterval<Key>,
): boolean {
  if (left === null) return false;
  if (left.panelId !== right.panelId || left.preset !== right.preset) return false;
  if (!sameIntervalAxis(left.domains.x, right.domains.x)) return false;
  if (!sameIntervalAxis(left.domains.y, right.domains.y)) return false;
  if (left.keys.length !== right.keys.length) return false;
  const rightKeys = new Set(right.keys);
  return left.keys.every((key) => rightKeys.has(key));
}

/** Apply a chart-local interval commit with the controller's atomic preset
 * switch semantics. A new preset starts a new record set; otherwise only the
 * matching origin panel is replaced (cross-panel always has one origin). */
export function nextLocalIntervalRecords<Key extends PropertyKey>(
  current: readonly PlotInteractionInterval<Key>[],
  next: PlotInteractionInterval<Key>,
): readonly PlotInteractionInterval<Key>[] {
  const priorPreset = current[0]?.preset;
  const reset = priorPreset !== undefined && priorPreset !== next.preset;
  const rest =
    reset || next.preset === "cross-panel"
      ? []
      : current.filter((record) => record.panelId !== next.panelId);
  return Object.freeze([...rest, next]);
}

/**
 * Single-pass panel recompute after an exact bounds edit: unique semantic keys
 * and optional lineage row count. Callers that need both keys and lineageCount
 * must supply `sourceRows` on each candidate so the store is not scanned twice
 * (interval-state precise-bounds path).
 */
export function recomputePanelIntervalProjection<Key extends PropertyKey>(
  input: RecomputePanelIntervalProjectionInput<Key>,
): { readonly keys: readonly Key[]; readonly lineageCount: number } {
  const inInterval = prepareCandidateInInterval(input.domains);
  const keys = new Set<Key>();
  const rows = new Set<number>();
  let trackRows = false;
  for (const candidate of input.candidates) {
    if (candidate.panelId !== input.panelId || !inInterval(candidate)) continue;
    for (const key of candidate.keys) keys.add(key);
    if (candidate.sourceRows === undefined) continue;
    trackRows = true;
    for (const rowIndex of candidate.sourceRows) rows.add(rowIndex);
  }
  return {
    keys: Object.freeze([...keys]),
    lineageCount: trackRows ? rows.size : 0,
  };
}

/** Recompute one panel's committed keys after an exact bounds edit. */
export function recomputePanelIntervalKeys<Key extends PropertyKey>(
  input: RecomputePanelIntervalKeysInput<Key>,
): readonly Key[] {
  return recomputePanelIntervalProjection(input).keys;
}
