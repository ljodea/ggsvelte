/**
 * Layer-major geometry batch construction across facet panels.
 */
import type { NormalizedGeomName } from "@ggsvelte/spec";

import type { PanelCoordProjector } from "../coord-projector.js";
import type { GeometryBatch } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import { geometryPanelFrame } from "./assemble-geometry-panel-frame.js";
import { createCoordTessellationBudget, projectGeometryBatch } from "./coord-geometry.js";
import type { FacetPanelDef } from "./facets.js";
import { buildBatch, flipBatchInPlace } from "./geometry.js";
import type { PanelPlacement } from "./panel-layout.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";

/**
 * Which geoms defer projection so path topology survives to
 * projectGeometryBatch. A path-shaped geom omitted here silently takes the
 * early panel projector and loses its topology, so the table is total over the
 * post-normalize geoms: a new geom is a compile error until someone decides
 * (#1042). `sf` is not a row of its own — see `pathLikeGeom` below.
 */
export const PATH_LIKE_GEOMS: Record<NormalizedGeomName, boolean> = {
  point: false,
  line: true,
  path: true,
  col: false,
  bar: false,
  area: true,
  rule: false,
  text: false,
  label: false,
  smooth: true,
  quantile: true,
  boxplot: false,
  density: true,
  errorbar: false,
  linerange: false,
  pointrange: false,
  crossbar: false,
  rect: false,
  tile: false,
  raster: false,
  ribbon: true,
  segment: false,
  count: false,
  violin: true,
  function: true,
  polygon: true,
  // Closed hex paths: project once in projectPathBatch (not via projected
  // panel scales), same as density_2d_filled / map (#800).
  hex: true,
  bin_2d: false,
  abline: false,
  curve: false,
  contour: true,
  density_2d: true,
  density_2d_filled: true,
  dotplot: false,
  map: true,
  // Overridden per frame — geom_sf points are ordinary PointsBatch marks and
  // must take the early projector; path/polygon sf defer like line/map (#809).
  sf: true,
  sf_text: false,
  sf_label: false,
  blank: false,
  spoke: false,
  rug: false,
  step: true,
  qq: false,
  qq_line: false,
};

/** Whether this frame defers projection. Only `sf` depends on its own data. */
function pathLikeGeom(frame: LayerFrame): boolean {
  const geom = frame.binding.layer.geom;
  if (geom === "sf") return frame.sf?.kind !== "point";
  return PATH_LIKE_GEOMS[geom];
}

export function buildGeometryBatches(input: {
  layerCount: number;
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  placements: readonly PanelPlacement[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  styles: ResolvedStyleScales;
  flip: boolean;
  coordProjectors: readonly PanelCoordProjector[];
  warnings: PipelineWarning[];
}): GeometryBatch[] {
  const {
    layerCount,
    facetPanels,
    panelFrames,
    placements,
    panelScales,
    color,
    fill,
    styles,
    flip,
    coordProjectors,
    warnings,
  } = input;
  const batches: GeometryBatch[] = [];
  for (let index = 0; index < layerCount; index++) {
    for (let p = 0; p < facetPanels.length; p++) {
      const frame = panelFrames[p]?.[index];
      if (frame === undefined) continue;
      const placement = placements[p]!;
      const projector = coordProjectors[p];
      const pathLike = pathLikeGeom(frame);
      const built = buildBatch(
        frame,
        // Path topology must retain coordinate-invalid authored/stat vertices
        // until the post-stat projector can split finite runs without bridging.
        geometryPanelFrame(placement, panelScales[p]!, flip, pathLike ? undefined : projector),
        color,
        fill,
        styles,
        warnings,
      );
      const tessellationBudget = createCoordTessellationBudget(built);
      for (const batch of built) {
        if (flip) flipBatchInPlace(batch, placement.width, placement.height);
        if (projector !== undefined) {
          projectGeometryBatch(
            batch,
            projector,
            placement.width,
            placement.height,
            warnings,
            tessellationBudget,
          );
        }
        batch.panelIndex = p;
        batches.push(batch);
      }
    }
  }
  return batches;
}
