import type { RenderModel } from "@ggsvelte/core";

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
  /** Candidates intersecting an already-expanded plot-px query rect. */
  queryCandidates(expanded: PlotRect): readonly { readonly lineage: number }[];
  lineageKeys(lineageId: number): Iterable<number>;
};

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
  readonly scales: Pick<RenderModel["scales"], "x" | "y">;
  readonly candidates: {
    queryRect(x0: number, y0: number, x1: number, y1: number): Iterable<number>;
    candidate(id: number): { readonly lineage: number } | null;
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
    queryCandidates(expanded) {
      return [...model.candidates.queryRect(expanded.x0, expanded.y0, expanded.x1, expanded.y1)]
        .map((id) => model.candidates.candidate(id))
        .filter((candidate): candidate is { readonly lineage: number } => candidate !== null);
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
  const expanded = expandIntervalQuery(input.pixels, scene.panel, input.mode, scene.flip);
  const candidates = scene.queryCandidates(expanded);
  const rowIndexes = lineageRowIndexesFromCandidates(candidates, (id) => scene.lineageKeys(id));
  const invertedDomain = scene.singlePanel
    ? panelDataDomains(input.pixels, scene.panel, scene.scales, scene.flip)
    : {};
  return {
    rowIndexes,
    panelId: scene.panel.id,
    invertedDomain,
  };
}

export type BuildIntervalSelectionFromSceneInput = {
  readonly phase: IntervalSelection["phase"];
  readonly mode: SelectAreaMode;
  readonly source: InteractionSource;
  readonly pixels: PlotRect;
  readonly scene: IntervalQueryScene | null;
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
