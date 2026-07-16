import { cellToNumber, encodeKey, type CellValue } from "@ggsvelte/core";

import type {
  PlotInteractionInterval,
  ReadonlyIntervalDomains,
  SemanticIntervalAxis,
} from "./interaction.js";

/** The stable identity surface needed to decide whether stored state is live. */
export interface IntervalConsumptionPanel {
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

  if (preset !== "cross-panel") {
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
