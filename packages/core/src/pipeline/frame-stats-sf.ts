/**
 * geom_sf frame expansion (#809 phase 1 + holes phase 4): portable GeoJSON
 * Geometry strings. Polygon interior rings share the exterior's group and use
 * ringIndex for even-odd holes. Already-projected coordinates only (no CRS /
 * coord_sf). Geometry lives as a JSON string in a data column (CellValue
 * cannot hold nested objects).
 */
import { ColumnTable, type CellValue } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import {
  expandSfLeaves,
  geometryFieldName,
  isFinitePair,
  parseSfGeometry,
  sfKindOf,
  type SfKind,
  type SfLeaf,
  type SfPosition,
} from "./sf-geometry.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

function styleColumn(
  table: ColumnTable,
  field: string | null,
  valueRows: readonly number[],
): readonly CellValue[] | null {
  if (field === null) return null;
  const col = table.column(field);
  return valueRows.map((row) => col[row]!);
}

function pushPoint(
  outX: number[],
  outY: number[],
  outGroups: number[],
  outRingIndex: number[],
  outRowIndex: number[],
  valueRows: number[],
  group: number,
  ringIndex: number,
  sourceRow: number,
  xy: SfPosition,
): void {
  outX.push(xy[0]);
  outY.push(xy[1]);
  outGroups.push(group);
  outRingIndex.push(ringIndex);
  outRowIndex.push(sourceRow);
  valueRows.push(sourceRow);
}

function pushRing(
  outX: number[],
  outY: number[],
  outGroups: number[],
  outRingIndex: number[],
  outRowIndex: number[],
  valueRows: number[],
  group: number,
  ringIndex: number,
  sourceRow: number,
  ring: unknown,
  minVerts: number,
): boolean {
  if (!Array.isArray(ring)) return false;
  const pts: SfPosition[] = [];
  for (const c of ring) {
    if (isFinitePair(c)) pts.push([c[0], c[1]]);
  }
  // Drop closing duplicate if present (polygonBatch closes via closed: true).
  if (pts.length >= 2) {
    const first = pts.at(0)!;
    const last = pts.at(-1)!;
    if (first[0] === last[0] && first[1] === last[1]) pts.pop();
  }
  if (pts.length < minVerts) return false;
  for (const p of pts) {
    pushPoint(
      outX,
      outY,
      outGroups,
      outRingIndex,
      outRowIndex,
      valueRows,
      group,
      ringIndex,
      sourceRow,
      p,
    );
  }
  return true;
}

/** Push every GeoJSON polygon ring; rings of one part share `group` (#809 phase 4). */
function pushPolygonRings(
  outX: number[],
  outY: number[],
  outGroups: number[],
  outRingIndex: number[],
  outRowIndex: number[],
  valueRows: number[],
  group: number,
  sourceRow: number,
  rings: unknown,
): void {
  if (!Array.isArray(rings)) return;
  for (let r = 0; r < rings.length; r++) {
    pushRing(
      outX,
      outY,
      outGroups,
      outRingIndex,
      outRowIndex,
      valueRows,
      group,
      r,
      sourceRow,
      rings[r],
      3,
    );
  }
}

export function buildSfFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  _warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const params = (layer.params ?? {}) as { geometry?: string };
  const field = geometryFieldName(params);
  if (!table.has(field)) {
    throw new PipelineError(
      "sf-geometry-missing",
      `/layers/${index}/params/geometry`,
      `geom_sf requires a geometry column "${field}" of GeoJSON Geometry JSON strings.`,
    );
  }

  const geomCol = table.column(field);
  const outX: number[] = [];
  const outY: number[] = [];
  const outGroups: number[] = [];
  const outRingIndex: number[] = [];
  const outRowIndex: number[] = [];
  const valueRows: number[] = [];

  let ringId = 0;
  let layerKind: SfKind | null = null;
  const layerPath = `/layers/${index}`;

  const emitLeaf = (leaf: SfLeaf, row: number): void => {
    const kind = sfKindOf(leaf.type);
    if (layerKind === null) layerKind = kind;
    else if (layerKind !== kind) {
      throw new PipelineError(
        "sf-geometry-mixed",
        layerPath,
        `geom_sf v1 requires a single geometry family per layer (found "${layerKind}" then "${kind}"). Split mixed types into separate layers.`,
      );
    }

    const coords = leaf.coordinates;
    if (leaf.type === "Point") {
      if (!isFinitePair(coords)) {
        throw new PipelineError(
          "sf-geometry-invalid",
          layerPath,
          "Point geometry requires a finite [x, y] coordinate pair.",
        );
      }
      pushPoint(
        outX,
        outY,
        outGroups,
        outRingIndex,
        outRowIndex,
        valueRows,
        ringId++,
        0,
        row,
        coords,
      );
      return;
    }
    if (leaf.type === "MultiPoint") {
      if (!Array.isArray(coords)) {
        throw new PipelineError(
          "sf-geometry-invalid",
          layerPath,
          "MultiPoint coordinates must be an array of positions.",
        );
      }
      for (const c of coords) {
        if (!isFinitePair(c)) continue;
        pushPoint(outX, outY, outGroups, outRingIndex, outRowIndex, valueRows, ringId++, 0, row, c);
      }
      return;
    }
    if (leaf.type === "LineString") {
      const g = ringId++;
      pushRing(outX, outY, outGroups, outRingIndex, outRowIndex, valueRows, g, 0, row, coords, 2);
      return;
    }
    if (leaf.type === "MultiLineString") {
      if (!Array.isArray(coords)) {
        throw new PipelineError(
          "sf-geometry-invalid",
          layerPath,
          "MultiLineString coordinates must be an array of line strings.",
        );
      }
      for (const line of coords) {
        const g = ringId++;
        pushRing(outX, outY, outGroups, outRingIndex, outRowIndex, valueRows, g, 0, row, line, 2);
      }
      return;
    }
    if (leaf.type === "Polygon") {
      if (!Array.isArray(coords) || coords.length === 0) {
        throw new PipelineError(
          "sf-geometry-invalid",
          layerPath,
          "Polygon coordinates must be a non-empty array of rings.",
        );
      }
      const g = ringId++;
      pushPolygonRings(outX, outY, outGroups, outRingIndex, outRowIndex, valueRows, g, row, coords);
      return;
    }
    // MultiPolygon
    if (!Array.isArray(coords)) {
      throw new PipelineError(
        "sf-geometry-invalid",
        layerPath,
        "MultiPolygon coordinates must be an array of polygons.",
      );
    }
    for (const poly of coords) {
      if (!Array.isArray(poly) || poly.length === 0) continue;
      const g = ringId++;
      pushPolygonRings(outX, outY, outGroups, outRingIndex, outRowIndex, valueRows, g, row, poly);
    }
  };

  for (let row = 0; row < table.rowCount; row++) {
    const path = `/layers/${index}/data/${field}`;
    const parsed = parseSfGeometry(geomCol[row]!, path);
    // GeometryCollection expands to leaves; groups continue across parts (ringId++).
    const leaves = expandSfLeaves(parsed, path);
    for (const leaf of leaves) emitLeaf(leaf, row);
  }

  if (layerKind === null || outX.length === 0) {
    throw new PipelineError(
      "sf-geometry-invalid",
      `/layers/${index}`,
      "geom_sf produced no drawable coordinates from the geometry column.",
    );
  }

  void groups;

  return {
    binding,
    table,
    n: outX.length,
    xValues: null,
    xNumeric: Float64Array.from(outX),
    yValues: null,
    yNumeric: Float64Array.from(outY),
    groups: outGroups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from(outRowIndex),
    colorValues: styleColumn(table, binding.color.field, valueRows),
    fillValues: styleColumn(table, binding.fill.field, valueRows),
    sizeValues: styleColumn(table, binding.size.field, valueRows),
    linewidthValues: styleColumn(table, binding.linewidth.field, valueRows),
    alphaValues: styleColumn(table, binding.alpha.field, valueRows),
    shapeValues: styleColumn(table, binding.shape.field, valueRows),
    linetypeValues: styleColumn(table, binding.linetype.field, valueRows),
    labelValues: styleColumn(table, binding.labelField, valueRows),
    ...emptyFrameExtras(),
    sf: {
      kind: layerKind,
      ...(layerKind === "polygon" ? { ringIndex: outRingIndex } : {}),
    },
  };
}
