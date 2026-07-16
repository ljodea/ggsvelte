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
  /** Faceted panels with their own trained positional scales. When present,
   * the requested stable panel identity enables local semantic inversion. */
  readonly panels?: readonly (PanelBounds & {
    readonly id: string;
    readonly scales: Pick<RenderModel["scales"], "x" | "y">;
  })[];
  /** Candidates intersecting an already-expanded plot-px query rect. */
  queryCandidates(expanded: PlotRect): readonly { readonly lineage: number }[];
  lineageKeys(lineageId: number): Iterable<number>;
};

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
  const candidates = scene.queryCandidates(expanded);
  const rowIndexes = lineageRowIndexesFromCandidates(candidates, (id) => scene.lineageKeys(id));
  const invertedDomain =
    scene.singlePanel || requestedPanel !== undefined
      ? panelDataDomains(input.pixels, panel, requestedPanel?.scales ?? scene.scales, scene.flip)
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
