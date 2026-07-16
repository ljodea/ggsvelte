import type { CellValue, RenderModel } from "@ggsvelte/core";

import type { InteractionSource, IntervalSelection } from "./interaction.js";
import {
  expandIntervalQuery,
  panelDataDomains,
  type PanelBounds,
  type PlotRect,
} from "./plot-geometry.js";
import {
  intervalSelectionFromRows,
  lineageRowIndexesFromCandidates,
  type IntervalDomain,
  type SelectAreaMode,
} from "./plot-interval.js";

/**
 * Narrow scene surface for interval query: one panel's geometry/scales plus
 * candidate → lineage → row resolution. Hosts map RenderModel into this view.
 */
export type IntervalQueryScene = {
  /** First panel, or null when the plot has no panels. */
  readonly panel: (PanelBounds & { readonly id: string | null }) | null;
  /** True when the plot has exactly one panel (domain invert is allowed). */
  readonly singlePanel: boolean;
  readonly flip: boolean;
  readonly scales: Pick<RenderModel["scales"], "x" | "y">;
  /** Faceted panels with their own trained positional scales. When present,
   * the requested stable panel identity enables local semantic inversion. */
  readonly panels?: readonly (PanelBounds & {
    readonly id: string;
    readonly scales: Pick<RenderModel["scales"], "x" | "y">;
  })[];
  /** Candidates intersecting an already-expanded plot-px query rect. */
  queryCandidates(
    expanded: PlotRect,
    panelId?: string | null,
  ): readonly { readonly lineage: number }[];
  lineageKeys(lineageId: number): Iterable<number>;
};

function bandDomain(
  scale: RenderModel["scales"]["x"],
  t0: number,
  t1: number,
): readonly [CellValue, CellValue] | undefined {
  if (scale.type !== "band" || scale.rawDomain.length === 0) return undefined;
  const lo = Math.max(0, Math.min(1, Math.min(t0, t1)));
  const hi = Math.max(0, Math.min(1, Math.max(t0, t1)));
  const first = Math.min(scale.rawDomain.length - 1, Math.floor(lo * scale.rawDomain.length));
  const last = Math.min(
    scale.rawDomain.length - 1,
    Math.max(first, Math.ceil(hi * scale.rawDomain.length) - 1),
  );
  return [scale.rawDomain[first] as CellValue, scale.rawDomain[last] as CellValue];
}

function bandDomains(
  pixels: PlotRect,
  panel: PanelBounds,
  scales: Pick<RenderModel["scales"], "x" | "y">,
  flipped: boolean,
): IntervalDomain {
  const tx0 = (pixels.x0 - panel.x) / panel.width;
  const tx1 = (pixels.x1 - panel.x) / panel.width;
  const ty0 = 1 - (pixels.y1 - panel.y) / panel.height;
  const ty1 = 1 - (pixels.y0 - panel.y) / panel.height;
  const horizontal = bandDomain(flipped ? scales.y : scales.x, tx0, tx1);
  const vertical = bandDomain(flipped ? scales.x : scales.y, ty0, ty1);
  return {
    ...(flipped
      ? vertical !== undefined && { x: vertical }
      : horizontal !== undefined && { x: horizontal }),
    ...(flipped
      ? horizontal !== undefined && { y: horizontal }
      : vertical !== undefined && { y: vertical }),
  };
}

/**
 * Structural port for building an IntervalQueryScene without requiring a full
 * RenderModel (tests use plain objects; production passes the live model).
 */
export type IntervalQueryModelPort = {
  readonly scene: {
    readonly panels: readonly (PanelBounds & {
      readonly id: string | null;
    })[];
  };
  readonly scales: Pick<RenderModel["scales"], "x" | "y"> & {
    readonly panels?: readonly Pick<RenderModel["scales"], "x" | "y">[];
  };
  readonly candidates: {
    queryRect(x0: number, y0: number, x1: number, y1: number): Iterable<number>;
    candidate(id: number): {
      readonly lineage: number;
      readonly panelIndex?: number;
    } | null;
  };
  readonly lineage: {
    keys(lineageId: number): Iterable<number>;
  };
};

/**
 * Map a model port + flip flag into the interval query scene adapter.
 * Hosts keep the `model === null` gate; this helper assumes a live model.
 */
export function intervalQuerySceneFromModel(
  model: IntervalQueryModelPort,
  flip: boolean,
): IntervalQueryScene {
  const panel = model.scene.panels[0];
  return {
    panel:
      panel === undefined
        ? null
        : {
            x: panel.x,
            y: panel.y,
            width: panel.width,
            height: panel.height,
            id: panel.id,
          },
    singlePanel: model.scene.panels.length === 1,
    flip,
    scales: model.scales,
    panels: model.scene.panels.flatMap((scenePanel, index) =>
      scenePanel.id === null
        ? []
        : [
            {
              x: scenePanel.x,
              y: scenePanel.y,
              width: scenePanel.width,
              height: scenePanel.height,
              id: scenePanel.id,
              scales: model.scales.panels?.[index] ?? model.scales,
            },
          ],
    ),
    queryCandidates(expanded, requestedPanelId) {
      const requestedPanelIndex =
        requestedPanelId === undefined || requestedPanelId === null
          ? -1
          : model.scene.panels.findIndex((candidate) => candidate.id === requestedPanelId);
      return [...model.candidates.queryRect(expanded.x0, expanded.y0, expanded.x1, expanded.y1)]
        .map((id) => model.candidates.candidate(id))
        .filter(
          (
            candidate,
          ): candidate is {
            readonly lineage: number;
            readonly panelIndex?: number;
          } =>
            candidate !== null &&
            (requestedPanelIndex < 0 ||
              candidate.panelIndex === undefined ||
              candidate.panelIndex === requestedPanelIndex),
        );
    },
    lineageKeys(lineageId) {
      return model.lineage.keys(lineageId);
    },
  };
}

export type ResolveIntervalQueryPartsInput = {
  readonly pixels: PlotRect;
  readonly mode: SelectAreaMode;
  readonly scene: IntervalQueryScene | null;
  /** Stable origin panel identity captured when the brush starts. */
  readonly panelId?: string | null;
};

/**
 * Expand the brush by select mode, collect lineage rows, invert domains when
 * a single panel is present. Empty/null scene yields empty keys and domain.
 */
export function resolveIntervalQueryParts(input: ResolveIntervalQueryPartsInput): {
  readonly rowIndexes: Set<number>;
  readonly panelId: string | null;
  readonly invertedDomain: IntervalDomain;
} {
  const scene = input.scene;
  if (scene === null || scene.panel === null) {
    return {
      rowIndexes: new Set(),
      panelId: null,
      invertedDomain: {},
    };
  }
  const requestedPanel =
    input.panelId === undefined || input.panelId === null
      ? undefined
      : scene.panels?.find((panel) => panel.id === input.panelId);
  const panel = requestedPanel ?? scene.panel;
  const expanded = expandIntervalQuery(input.pixels, panel, input.mode, scene.flip);
  const candidates = scene.queryCandidates(expanded, panel.id);
  const rowIndexes = lineageRowIndexesFromCandidates(candidates, (id) => scene.lineageKeys(id));
  const continuousDomain =
    scene.singlePanel || requestedPanel !== undefined
      ? panelDataDomains(input.pixels, panel, requestedPanel?.scales ?? scene.scales, scene.flip)
      : {};
  const invertedDomain =
    scene.singlePanel || requestedPanel !== undefined
      ? {
          ...bandDomains(input.pixels, panel, requestedPanel?.scales ?? scene.scales, scene.flip),
          ...continuousDomain,
        }
      : {};
  return {
    rowIndexes,
    panelId: panel.id,
    invertedDomain,
  };
}

export type BuildIntervalSelectionFromSceneInput = {
  readonly phase: IntervalSelection["phase"];
  readonly mode: SelectAreaMode;
  readonly source: InteractionSource;
  readonly pixels: PlotRect;
  readonly scene: IntervalQueryScene | null;
  readonly panelId?: string | null;
  readonly keyForRow: (rowIndex: number) => PropertyKey | null;
};

/** Full interval selection event from normalized pixels + scene adapter. */
export function buildIntervalSelectionFromScene(
  input: BuildIntervalSelectionFromSceneInput,
): IntervalSelection {
  const parts = resolveIntervalQueryParts({
    pixels: input.pixels,
    mode: input.mode,
    scene: input.scene,
    ...(input.panelId !== undefined && { panelId: input.panelId }),
  });
  return intervalSelectionFromRows({
    phase: input.phase,
    mode: input.mode,
    panelId: parts.panelId,
    pixels: input.pixels,
    source: input.source,
    rowIndexes: parts.rowIndexes,
    keyForRow: input.keyForRow,
    invertedDomain: parts.invertedDomain,
  });
}
