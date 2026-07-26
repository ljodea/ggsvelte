/**
 * Portable GeoJSON Geometry helpers for geom_sf / stat_sf_coordinates (#809).
 * Geometry cells are JSON strings (CellValue cannot hold nested objects).
 */
import type { CellValue } from "../table.js";

import { PipelineError } from "./types.js";

export type SfKind = "point" | "line" | "polygon";
export type SfPosition = readonly [number, number];

export function isFinitePair(c: unknown): c is SfPosition {
  return (
    Array.isArray(c) &&
    c.length >= 2 &&
    typeof c[0] === "number" &&
    typeof c[1] === "number" &&
    Number.isFinite(c[0]) &&
    Number.isFinite(c[1])
  );
}

export function parseSfGeometry(
  raw: CellValue,
  path: string,
): { type: string; coordinates: unknown } {
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
  if (parsed === null || typeof parsed !== "object" || !("type" in parsed)) {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      'geom_sf geometry must be a GeoJSON Geometry object with a string "type".',
    );
  }
  const type = parsed.type;
  if (typeof type !== "string") {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      'geom_sf geometry must be a GeoJSON Geometry object with a string "type".',
    );
  }
  const coordinates = "coordinates" in parsed ? parsed.coordinates : undefined;
  return { type, coordinates };
}

export function sfKindOf(type: string, path = "/geometry"): SfKind {
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
        path,
        `geom_sf does not support GeoJSON type "${type}" in v1 (point/line/polygon families only; no GeometryCollection or CRS).`,
      );
  }
}

function ringPositions(ring: unknown): SfPosition[] {
  if (!Array.isArray(ring)) return [];
  const pts: SfPosition[] = [];
  for (const c of ring) {
    if (isFinitePair(c)) pts.push([c[0], c[1]]);
  }
  if (pts.length >= 2) {
    const first = pts.at(0)!;
    const last = pts.at(-1)!;
    if (first[0] === last[0] && first[1] === last[1]) pts.pop();
  }
  return pts;
}

function meanPosition(pts: readonly SfPosition[]): SfPosition | null {
  if (pts.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p[0];
    sy += p[1];
  }
  return [sx / pts.length, sy / pts.length];
}

/** Shoelace centroid for a simple exterior ring; falls back to vertex mean. */
function polygonCentroid(ring: unknown): SfPosition | null {
  const pts = ringPositions(ring);
  if (pts.length < 3) return meanPosition(pts);
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[(i + 1) % pts.length]!;
    const cross = x0 * y1 - x1 * y0;
    area2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (!Number.isFinite(area2) || Math.abs(area2) < 1e-12) return meanPosition(pts);
  const inv = 1 / (3 * area2);
  const x = cx * inv;
  const y = cy * inv;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return meanPosition(pts);
  return [x, y];
}

/**
 * One representative point per feature (ggplot2 stat_sf_coordinates-style).
 * Multi* geometries use the first component only in v1.
 */
export function representativePoint(type: string, coordinates: unknown): SfPosition | null {
  if (type === "Point") return isFinitePair(coordinates) ? coordinates : null;
  if (type === "MultiPoint") {
    if (!Array.isArray(coordinates)) return null;
    const pts: SfPosition[] = [];
    for (const c of coordinates) {
      if (isFinitePair(c)) pts.push(c);
    }
    return meanPosition(pts);
  }
  if (type === "LineString") return meanPosition(ringPositions(coordinates));
  if (type === "MultiLineString") {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
    return meanPosition(ringPositions(coordinates[0]));
  }
  if (type === "Polygon") {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
    return polygonCentroid(coordinates[0]);
  }
  if (type === "MultiPolygon") {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
    const poly: unknown = coordinates[0];
    if (!Array.isArray(poly) || poly.length === 0) return null;
    return polygonCentroid(poly[0]);
  }
  return null;
}

export function geometryFieldName(params: { geometry?: string } | undefined): string {
  const g = params?.geometry;
  return g !== undefined && g !== "" ? g : "geometry";
}
