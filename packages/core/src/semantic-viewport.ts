/**
 * Model-owned panel projection from plot pixels into semantic axis values.
 */
import type { PositionScale } from "./scales/train.js";
import type { PositionTransformName } from "./scales/transform.js";
import type { ScenePanel } from "./scene.js";
import type { PanelCoordProjector } from "./coord-projector.js";
import type { CellValue } from "./table.js";
import type {
  CandidateFacts,
  CandidateInspectMode,
  CandidateMatch,
  CandidateStore,
} from "./candidate-store.js";
import { encodeKey } from "./scales/state.js";

export interface PlotRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface SemanticViewportDomains {
  readonly x?: readonly [CellValue, CellValue];
  readonly y?: readonly [CellValue, CellValue];
}

export type SemanticViewportAxisSelection =
  | { readonly kind: "continuous"; readonly domain: readonly [number, number] }
  | { readonly kind: "band"; readonly keys: readonly string[] };

export interface SemanticViewportSelection {
  readonly x?: SemanticViewportAxisSelection;
  readonly y?: SemanticViewportAxisSelection;
}

export interface NormalizedSpan {
  readonly x: number;
  readonly y: number;
}

export type AxisEditModel =
  | {
      readonly kind: "continuous";
      readonly type: "linear" | "time";
      readonly transform: PositionTransformName;
      readonly domain: readonly [number, number];
      readonly reversed: boolean;
    }
  | {
      readonly kind: "band";
      readonly rawDomain: readonly CellValue[];
      readonly reversed: boolean;
      slice(bounds: readonly [unknown, unknown]): readonly CellValue[] | undefined;
    };

export interface SemanticViewportPanel {
  readonly id: string;
  readonly bounds: PlotRect;
  /** Pre-flip screen-normalized axis widths of `rect` within panel bounds. */
  normalizedSpan(rect: PlotRect): NormalizedSpan;
  /** Per-axis edit surface for bounds editors (domain, reversal, band slicing). */
  axisEditModel(axis: "x" | "y"): AxisEditModel;
  invert(rect: PlotRect): SemanticViewportDomains;
  project(selection: SemanticViewportSelection): PlotRect;
  resolve(selection: SemanticViewportSelection): SemanticViewportDomains;
  query(rect: PlotRect, mode: "x" | "y" | "xy"): readonly CandidateFacts[];
  /**
   * Nearest candidate in this panel only. Soft targeting (does not enforce
   * panel clip); contrast `CandidateStore.hitTest`, which is clip-gated.
   * Prefer this over store.nearest without panelId so faceted hover/select
   * cannot seed another panel's mark (#787).
   */
  nearest(
    point: Readonly<{ x: number; y: number }>,
    options: { mode: CandidateInspectMode; maxDistance: number },
  ): CandidateMatch | null;
}

/** Capture-element client box used by `locate` (DOM-free; host supplies rect). */
export interface ClientRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface SemanticViewport {
  readonly panels: readonly SemanticViewportPanel[];
  panel(id: string): SemanticViewportPanel | null;
  panelAt(point: Readonly<{ x: number; y: number }>): SemanticViewportPanel | null;
  /**
   * Panel under `point`, or the sole panel when the plot has exactly one.
   * Owns the single-panel outside-panel brush/inspect fallback so interaction
   * callers do not reimplement it divergently (#787).
   */
  panelAtOrOnly(point: Readonly<{ x: number; y: number }>): SemanticViewportPanel | null;
  /**
   * Map a client pointer position into plot/scene coordinates.
   * Owns scene scaling and the zero-size guard. Out-of-bounds clients are not
   * clamped (callers may drag past the capture edge). Host extracts the rect
   * from the event target — core stays DOM-free (#1038).
   */
  locate(clientX: number, clientY: number, rect: ClientRect): Readonly<{ x: number; y: number }>;
}

type ViewportScales = {
  readonly x: PositionScale;
  readonly y: PositionScale;
  readonly panels: readonly Readonly<{ x: PositionScale; y: PositionScale }>[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function semanticDomain(
  scale: PositionScale,
  start: number,
  end: number,
): readonly [CellValue, CellValue] | undefined {
  if (scale.type === "band") {
    if (scale.rawDomain.length === 0) return undefined;
    const lower = clamp(Math.min(start, end));
    const upper = clamp(Math.max(start, end));
    const reversed = scale.rawDomain.length > 1 && (scale.normalize(scale.rawDomain[0]) ?? 0) > 0.5;
    const firstFraction = reversed ? 1 - upper : lower;
    const lastFraction = reversed ? 1 - lower : upper;
    const first = Math.min(
      scale.rawDomain.length - 1,
      Math.floor(firstFraction * scale.rawDomain.length),
    );
    const last = Math.min(
      scale.rawDomain.length - 1,
      Math.max(first, Math.ceil(lastFraction * scale.rawDomain.length) - 1),
    );
    return [scale.rawDomain[first] as CellValue, scale.rawDomain[last] as CellValue];
  }
  const first = scale.invert(start);
  const last = scale.invert(end);
  return first <= last ? [first, last] : [last, first];
}

/** Band key lookup: domain value plus its domain index (for extent without re-normalize). */
type BandKeyEntry = {
  readonly value: CellValue;
  readonly index: number;
};

function bandValueIndex(scale: PositionScale): ReadonlyMap<string, BandKeyEntry> {
  const valuesByKey = new Map<string, BandKeyEntry>();
  if (scale.type !== "band") return valuesByKey;
  let index = 0;
  for (const value of scale.rawDomain) {
    const cell = value as CellValue;
    const key = encodeKey(cell);
    // First-seen wins, matching trainBand's index map.
    if (!valuesByKey.has(key)) valuesByKey.set(key, { value: cell, index });
    index += 1;
  }
  return valuesByKey;
}

/**
 * First and last selected keys that land on the axis.
 *
 * `resolve` reports only the two ends, so scan inward from each rather than
 * mapping the whole selection: the key list is caller-supplied and as long as
 * the axis has categories, and mapping it allocated an array per key to read
 * two values. A key the axis does not carry is skipped, exactly as the map
 * step dropped it.
 */
function bandSpanForKeys(
  valuesByKey: ReadonlyMap<string, BandKeyEntry>,
  keys: readonly string[],
): readonly [CellValue, CellValue] | undefined {
  let firstIndex = -1;
  let first: CellValue | undefined;
  for (let i = 0; i < keys.length; i++) {
    const entry = valuesByKey.get(keys[i]!);
    if (entry !== undefined) {
      first = entry.value;
      firstIndex = i;
      break;
    }
  }
  if (firstIndex === -1) return undefined;
  for (let i = keys.length - 1; i > firstIndex; i--) {
    const entry = valuesByKey.get(keys[i]!);
    if (entry !== undefined) return [first!, entry.value];
  }
  // Only one key landed on the axis; it is both ends.
  return [first!, first!];
}

function projectedSpan(
  scale: PositionScale,
  selection: SemanticViewportAxisSelection | undefined,
  coord: PanelCoordProjector["x"] | undefined,
  bandValuesByKey: ReadonlyMap<string, BandKeyEntry>,
): readonly [number, number] {
  if (selection === undefined) return [0, 1];
  let first: number | undefined;
  let last: number | undefined;
  if (selection.kind === "band") {
    if (scale.type !== "band") return [0, 1];
    // Span is min/max of band centers, expanded by half a step. Centers are
    // monotone in domain index (including reverse), so track the extreme
    // indices and normalize only those two values — not every selected key
    // (#1332). Still one pass over keys: non-contiguous selections can put
    // extremes anywhere in the list. Never `Math.min(...centers)`: spreading
    // unbounded keys RangeErrors (same hazard as grouping.ts).
    let minIndex = Infinity;
    let maxIndex = -Infinity;
    let minValue: CellValue | undefined;
    let maxValue: CellValue | undefined;
    for (const key of selection.keys) {
      const entry = bandValuesByKey.get(key);
      if (entry === undefined) continue;
      if (entry.index < minIndex) {
        minIndex = entry.index;
        minValue = entry.value;
      }
      if (entry.index > maxIndex) {
        maxIndex = entry.index;
        maxValue = entry.value;
      }
    }
    if (minValue === undefined || maxValue === undefined) return [0, 1];
    const c0 = scale.normalize(minValue);
    const c1 = minIndex === maxIndex ? c0 : scale.normalize(maxValue);
    if (c0 === undefined || c1 === undefined) return [0, 1];
    const minCenter = Math.min(c0, c1);
    const maxCenter = Math.max(c0, c1);
    const halfStep = scale.step / 2;
    first = Math.max(0, minCenter - halfStep);
    last = Math.min(1, maxCenter + halfStep);
  } else {
    if (scale.type === "band") return [0, 1];
    const firstValue = scale.normalize(selection.domain[0]);
    const lastValue = scale.normalize(selection.domain[1]);
    if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue)) return [0, 1];
    first = Math.max(0, Math.min(firstValue, lastValue));
    last = Math.min(1, Math.max(firstValue, lastValue));
  }
  const projectedFirst = coord?.projectFraction(first) ?? first;
  const projectedLast = coord?.projectFraction(last) ?? last;
  if (!Number.isFinite(projectedFirst) || !Number.isFinite(projectedLast)) return [0, 1];
  return [
    Math.max(0, Math.min(projectedFirst, projectedLast)),
    Math.min(1, Math.max(projectedFirst, projectedLast)),
  ];
}

function axisEditModelForScale(scale: PositionScale): AxisEditModel {
  if (scale.type === "band") {
    const reversed = scale.rawDomain.length > 1 && (scale.normalize(scale.rawDomain[0]) ?? 0) > 0.5;
    return {
      kind: "band",
      rawDomain: scale.rawDomain as readonly CellValue[],
      reversed,
      slice(bounds) {
        const first = scale.indexOf(bounds[0]);
        const last = scale.indexOf(bounds[1]);
        let values: readonly CellValue[] | undefined;
        if (first !== undefined && last !== undefined) {
          const lower = Math.min(first, last);
          const upper = Math.max(first, last);
          values = scale.rawDomain.slice(lower, upper + 1) as readonly CellValue[];
        }
        return values;
      },
    };
  }
  return {
    kind: "continuous",
    type: scale.type,
    transform: scale.transform,
    domain: scale.domain,
    reversed: scale.normalize(scale.domain[0]) > scale.normalize(scale.domain[1]),
  };
}

function createPanel(
  panel: ScenePanel,
  scales: Readonly<{ x: PositionScale; y: PositionScale }>,
  coord: PanelCoordProjector | undefined,
  flipped: boolean,
  candidates: CandidateStore,
  indexFor: (scale: PositionScale) => ReadonlyMap<string, BandKeyEntry>,
): SemanticViewportPanel {
  const xBandValuesByKey = indexFor(scales.x);
  const yBandValuesByKey = indexFor(scales.y);
  return {
    id: panel.id,
    bounds: {
      x0: panel.x,
      y0: panel.y,
      x1: panel.x + panel.width,
      y1: panel.y + panel.height,
    },
    normalizedSpan(rect) {
      const th0 = clamp((rect.x0 - panel.x) / panel.width);
      const th1 = clamp((rect.x1 - panel.x) / panel.width);
      const tv0 = clamp(1 - (rect.y1 - panel.y) / panel.height);
      const tv1 = clamp(1 - (rect.y0 - panel.y) / panel.height);
      return { x: th1 - th0, y: tv1 - tv0 };
    },
    axisEditModel(axis) {
      return axisEditModelForScale(scales[axis]);
    },
    invert(rect) {
      const screenX0 = clamp((rect.x0 - panel.x) / panel.width);
      const screenX1 = clamp((rect.x1 - panel.x) / panel.width);
      const screenY0 = clamp(1 - (rect.y1 - panel.y) / panel.height);
      const screenY1 = clamp(1 - (rect.y0 - panel.y) / panel.height);
      const x0 = coord?.x.invertFraction(screenX0) ?? screenX0;
      const x1 = coord?.x.invertFraction(screenX1) ?? screenX1;
      const y0 = coord?.y.invertFraction(screenY0) ?? screenY0;
      const y1 = coord?.y.invertFraction(screenY1) ?? screenY1;
      const horizontal = semanticDomain(flipped ? scales.y : scales.x, x0, x1);
      const vertical = semanticDomain(flipped ? scales.x : scales.y, y0, y1);
      const x = flipped ? vertical : horizontal;
      const y = flipped ? horizontal : vertical;
      return {
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      };
    },
    project(selection) {
      const x = projectedSpan(scales.x, selection.x, coord?.x, xBandValuesByKey);
      const y = projectedSpan(scales.y, selection.y, coord?.y, yBandValuesByKey);
      const horizontal = flipped ? y : x;
      const vertical = flipped ? x : y;
      return {
        x0: panel.x + horizontal[0] * panel.width,
        x1: panel.x + horizontal[1] * panel.width,
        y0: panel.y + (1 - vertical[1]) * panel.height,
        y1: panel.y + (1 - vertical[0]) * panel.height,
      };
    },
    resolve(selection) {
      const resolveAxis = (
        scale: PositionScale,
        axis: SemanticViewportAxisSelection | undefined,
        bandValuesByKey: ReadonlyMap<string, BandKeyEntry>,
      ): readonly [CellValue, CellValue] | undefined => {
        if (axis === undefined) return undefined;
        if (axis.kind === "continuous") return axis.domain;
        if (scale.type !== "band") return undefined;
        return bandSpanForKeys(bandValuesByKey, axis.keys);
      };
      const x = resolveAxis(scales.x, selection.x, xBandValuesByKey);
      const y = resolveAxis(scales.y, selection.y, yBandValuesByKey);
      return {
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      };
    },
    query(rect, mode) {
      const expanded =
        mode === "x"
          ? flipped
            ? { ...rect, x0: panel.x, x1: panel.x + panel.width }
            : { ...rect, y0: panel.y, y1: panel.y + panel.height }
          : mode === "y"
            ? flipped
              ? { ...rect, y0: panel.y, y1: panel.y + panel.height }
              : { ...rect, x0: panel.x, x1: panel.x + panel.width }
            : rect;
      const matches: CandidateFacts[] = [];
      for (const id of candidates.queryRect(
        expanded.x0,
        expanded.y0,
        expanded.x1,
        expanded.y1,
        panel.id,
      )) {
        const candidate = candidates.candidate(id);
        if (candidate !== null) matches.push(candidate);
      }
      return matches;
    },
    nearest(point, options) {
      return candidates.nearest(point.x, point.y, {
        mode: options.mode,
        maxDistance: options.maxDistance,
        panelId: panel.id,
      });
    },
  };
}

export type CreateSemanticViewportInput = {
  readonly panels: readonly ScenePanel[];
  readonly scales: ViewportScales;
  readonly coordProjectors: readonly PanelCoordProjector[];
  readonly flipped: boolean;
  readonly candidates: CandidateStore;
  /** Plot pixel size used by `locate` for client → scene scaling. */
  readonly sceneSize: Readonly<{ width: number; height: number }>;
};

export function createSemanticViewport(input: CreateSemanticViewportInput): SemanticViewport {
  const { panels, scales, coordProjectors, flipped, candidates, sceneSize } = input;
  // Under fixed facet scales every panel is handed the same scale object, so
  // building the band index per panel walked one domain once per panel and kept
  // a copy of it per panel. Key on the object: free scales give each panel its
  // own scale, so they still get their own index. The map is local to this
  // viewport and never written after it is built, so panels can share it.
  const bandIndexByScale = new WeakMap<PositionScale, ReadonlyMap<string, BandKeyEntry>>();
  const indexFor = (scale: PositionScale): ReadonlyMap<string, BandKeyEntry> => {
    let index = bandIndexByScale.get(scale);
    if (index === undefined) {
      index = bandValueIndex(scale);
      bandIndexByScale.set(scale, index);
    }
    return index;
  };
  const viewportPanels = panels.map((panel, panelIndex) =>
    createPanel(
      panel,
      scales.panels[panelIndex] ?? scales,
      coordProjectors[panelIndex],
      flipped,
      candidates,
      indexFor,
    ),
  );
  function panelAt(point: Readonly<{ x: number; y: number }>): SemanticViewportPanel | null {
    return (
      viewportPanels.find(
        (panel) =>
          point.x >= panel.bounds.x0 &&
          point.x <= panel.bounds.x1 &&
          point.y >= panel.bounds.y0 &&
          point.y <= panel.bounds.y1,
      ) ?? null
    );
  }
  return {
    panels: viewportPanels,
    panel(id) {
      return viewportPanels.find((panel) => panel.id === id) ?? null;
    },
    panelAt,
    panelAtOrOnly(point) {
      return panelAt(point) ?? (viewportPanels.length === 1 ? (viewportPanels[0] ?? null) : null);
    },
    locate(clientX, clientY, rect) {
      if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      return {
        x: ((clientX - rect.left) / rect.width) * sceneSize.width,
        y: ((clientY - rect.top) / rect.height) * sceneSize.height,
      };
    },
  };
}
