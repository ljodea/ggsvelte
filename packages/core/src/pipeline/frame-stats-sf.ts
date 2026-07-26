/**
 * geom_sf frame expansion (#809 phase 1): portable GeoJSON Geometry strings.
 *
 * Already-projected coordinates only (no CRS / coord_sf). Geometry lives as a
 * JSON string in a data column (CellValue cannot hold nested objects).
 */
import { ColumnTable, type CellValue } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

type SfKind = "point" | "line" | "polygon";

type Position = readonly [number, number];

function isFinitePair(c: unknown): c is Position {
  return (
    Array.isArray(c) &&
    c.length >= 2 &&
    typeof c[0] === "number" &&
    typeof c[1] === "number" &&
    Number.isFinite(c[0]) &&
    Number.isFinite(c[1])
  );
}

function parseGeometry(raw: CellValue, path: string): { type: string; coordinates: unknown } {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      "geom_sf geometry cells must be non-empty GeoJSON Geometry JSON strings.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      "geom_sf geometry cell is not valid JSON.",
    );
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("type" in parsed) ||
    typeof parsed.type !== "string"
  ) {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      'geom_sf geometry must be a GeoJSON Geometry object with a string "type".',
    );
  }
  const coordinates = "coordinates" in parsed ? parsed.coordinates : undefined;
  return { type: parsed.type, coordinates };
}

function kindOf(type: string): SfKind {
  switch (type) {
    case "Point":
    case "MultiPoint":
      return "point";
    case "LineString":
    case "MultiLineString":
      return "line";
    case "Polygon":
    case "MultiPolygon":
      return "polygon";
    default:
      throw new PipelineError(
        "sf-geometry-unsupported",
        "/geometry",
        `geom_sf does not support GeoJSON type "${type}" in v1 (point/line/polygon families only; no GeometryCollection or CRS).`,
      );
  }
}

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
  outRowIndex: number[],
  valueRows: number[],
  group: number,
  sourceRow: number,
  xy: Position,
): void {
  outX.push(xy[0]);
  outY.push(xy[1]);
  outGroups.push(group);
  outRowIndex.push(sourceRow);
  valueRows.push(sourceRow);
}

function pushRing(
  outX: number[],
  outY: number[],
  outGroups: number[],
  outRowIndex: number[],
  valueRows: number[],
  group: number,
  sourceRow: number,
  ring: unknown,
  minVerts: number,
): boolean {
  if (!Array.isArray(ring)) return false;
  const pts: Position[] = [];
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
    pushPoint(outX, outY, outGroups, outRowIndex, valueRows, group, sourceRow, p);
  }
  return true;
}

export function buildSfFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const params = (layer.params ?? {}) as { geometry?: string };
  const field =
    params.geometry !== undefined && params.geometry !== "" ? params.geometry : "geometry";
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
  const outRowIndex: number[] = [];
  const valueRows: number[] = [];

  let ringId = 0;
  let layerKind: SfKind | null = null;
  let holesIgnored = 0;

  for (let row = 0; row < table.rowCount; row++) {
    const parsed = parseGeometry(geomCol[row]!, `/layers/${index}/data/${field}`);
    const kind = kindOf(parsed.type);
    if (layerKind === null) layerKind = kind;
    else if (layerKind !== kind) {
      throw new PipelineError(
        "sf-geometry-mixed",
        `/layers/${index}`,
        `geom_sf v1 requires a single geometry family per layer (found "${layerKind}" then "${kind}"). Split mixed types into separate layers.`,
      );
    }

    const coords = parsed.coordinates;
    if (parsed.type === "Point") {
      if (!isFinitePair(coords)) {
        throw new PipelineError(
          "sf-geometry-invalid",
          `/layers/${index}`,
          "Point geometry requires a finite [x, y] coordinate pair.",
        );
      }
      pushPoint(outX, outY, outGroups, outRowIndex, valueRows, ringId++, row, coords);
      continue;
    }
    if (parsed.type === "MultiPoint") {
      if (!Array.isArray(coords)) {
        throw new PipelineError(
          "sf-geometry-invalid",
          `/layers/${index}`,
          "MultiPoint coordinates must be an array of positions.",
        );
      }
      for (const c of coords) {
        if (!isFinitePair(c)) continue;
        pushPoint(outX, outY, outGroups, outRowIndex, valueRows, ringId++, row, c);
      }
      continue;
    }
    if (parsed.type === "LineString") {
      const g = ringId++;
      if (!pushRing(outX, outY, outGroups, outRowIndex, valueRows, g, row, coords, 2)) {
        // drop empty
      }
      continue;
    }
    if (parsed.type === "MultiLineString") {
      if (!Array.isArray(coords)) {
        throw new PipelineError(
          "sf-geometry-invalid",
          `/layers/${index}`,
          "MultiLineString coordinates must be an array of line strings.",
        );
      }
      for (const line of coords) {
        const g = ringId++;
        pushRing(outX, outY, outGroups, outRowIndex, valueRows, g, row, line, 2);
      }
      continue;
    }
    if (parsed.type === "Polygon") {
      if (!Array.isArray(coords) || coords.length === 0) {
        throw new PipelineError(
          "sf-geometry-invalid",
          `/layers/${index}`,
          "Polygon coordinates must be a non-empty array of rings.",
        );
      }
      if (coords.length > 1) holesIgnored += coords.length - 1;
      const g = ringId++;
      pushRing(outX, outY, outGroups, outRowIndex, valueRows, g, row, coords[0], 3);
      continue;
    }
    // MultiPolygon
    if (!Array.isArray(coords)) {
      throw new PipelineError(
        "sf-geometry-invalid",
        `/layers/${index}`,
        "MultiPolygon coordinates must be an array of polygons.",
      );
    }
    for (const poly of coords) {
      if (!Array.isArray(poly) || poly.length === 0) continue;
      if (poly.length > 1) holesIgnored += poly.length - 1;
      const g = ringId++;
      pushRing(outX, outY, outGroups, outRowIndex, valueRows, g, row, poly[0], 3);
    }
  }

  if (holesIgnored > 0) {
    warnings.push({
      code: "sf-holes-ignored",
      message: `Layer ${index} (sf): ignored ${holesIgnored} interior ring(s); v1 draws exterior rings only.`,
    });
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
    sf: { kind: layerKind },
  };
}
