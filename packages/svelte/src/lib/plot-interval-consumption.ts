import { cellToNumber, encodeKey, type CellValue } from "@ggsvelte/core";

import type {
  PlotInteractionInterval,
  ReadonlyIntervalDomains,
  SemanticIntervalAxis,
} from "./interaction.js";

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

function numericAxisContains(axis: SemanticIntervalAxis, value: CellValue): boolean {
  if (axis.kind === "band") return false;
  const numeric = cellToNumber(value);
  if (!Number.isFinite(numeric)) return false;
  if (axis.kind === "log" && numeric <= 0) return false;
  return numeric >= axis.domain[0] && numeric <= axis.domain[1];
}

function axisContains(axis: SemanticIntervalAxis, value: CellValue | undefined): boolean {
  if (value === undefined) return false;
  return axis.kind === "band"
    ? axis.values.includes(encodeKey(value))
    : numericAxisContains(axis, value);
}

export function candidateInInterval(
  candidate: Pick<IntervalConsumptionCandidate<PropertyKey>, "xValue" | "yValue">,
  domains: ReadonlyIntervalDomains,
): boolean {
  return (
    (domains.x === undefined || axisContains(domains.x, candidate.xValue)) &&
    (domains.y === undefined || axisContains(domains.y, candidate.yValue))
  );
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
    return uniqueKeys(
      input.records
        .filter((record) => record.preset === "independent" && visiblePanels.has(record.panelId))
        .flatMap((record) => {
          // Indexed lookup: a persistent brush can hold tens of thousands of
          // keys, and a linear includes() per candidate key is quadratic.
          const recordKeys = new Set<Key>(record.keys);
          return input.candidates
            .filter((candidate) => candidate.panelId === record.panelId)
            .map((candidate) => candidate.keys.filter((key) => recordKeys.has(key)));
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
  return uniqueKeys(
    input.candidates
      .filter(
        (candidate) =>
          visiblePanels.has(candidate.panelId) && candidateInInterval(candidate, origin.domains),
      )
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

/** Recompute one panel's committed keys after an exact bounds edit. */
export function recomputePanelIntervalKeys<Key extends PropertyKey>(
  input: RecomputePanelIntervalKeysInput<Key>,
): readonly Key[] {
  return uniqueKeys(
    input.candidates
      .filter(
        (candidate) =>
          candidate.panelId === input.panelId && candidateInInterval(candidate, input.domains),
      )
      .map((candidate) => candidate.keys),
  );
}
