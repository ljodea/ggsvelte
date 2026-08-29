/**
 * Portable GeoJSON Geometry helpers for geom_sf / stat_sf_coordinates (#809).
 * Geometry cells are JSON strings (CellValue cannot hold nested objects).
 */
import type { CellValue } from "../table.js";

import { PipelineError } from "./types.js";

export type SfKind = "point" | "line" | "polygon";
export type SfPosition = readonly [number, number];

/** Parsed GeoJSON Geometry object (coordinates and/or nested geometries). */
export type SfParsed = {
  type: string;
  coordinates?: unknown;
  geometries?: unknown;
};

/** Leaf geometry after GeometryCollection flattening (#809 phase 6). */
export type SfLeaf = {
  type: string;
  coordinates: unknown;
};

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

export function parseSfGeometry(raw: CellValue, path: string): SfParsed {
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
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      'geom_sf geometry must be a GeoJSON Geometry object with a string "type".',
    );
  }
  const record = parsed as Record<string, unknown>;
  const type = record["type"];
  if (typeof type !== "string") {
    throw new PipelineError(
      "sf-geometry-invalid",
      path,
      'geom_sf geometry must be a GeoJSON Geometry object with a string "type".',
    );
  }
  const coordinates = record["coordinates"];
  const geometries = record["geometries"];
  return {
    type,
    ...(coordinates !== undefined && { coordinates }),
    ...(geometries !== undefined && { geometries }),
  };
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
        `geom_sf does not support GeoJSON type "${type}" in v1 (point/line/polygon families only; no CRS).`,
      );
  }
}

/** Max GeometryCollection nesting depth (prevents unbounded recursion). */
const MAX_GEOMETRY_COLLECTION_DEPTH = 32;

/**
 * Flatten GeometryCollection (recursively) to leaf Point/Line/Polygon families.
 * Empty collections yield []. Mixed families are not filtered here — callers
 * enforce layer homogeneity via {@link sfKindOf}. Nesting is capped at
 * {@link MAX_GEOMETRY_COLLECTION_DEPTH}.
 */
export function expandSfLeaves(geom: SfParsed, path: string, depth = 0): SfLeaf[] {
  if (geom.type === "GeometryCollection") {
    if (depth >= MAX_GEOMETRY_COLLECTION_DEPTH) {
      throw new PipelineError(
        "sf-geometry-invalid",
        path,
        `GeometryCollection nesting exceeds ${MAX_GEOMETRY_COLLECTION_DEPTH} levels.`,
      );
    }
    if (!Array.isArray(geom.geometries)) {
      throw new PipelineError(
        "sf-geometry-invalid",
        path,
        "GeometryCollection requires a geometries array.",
      );
    }
    const out: SfLeaf[] = [];
    for (const child of geom.geometries) {
      if (
        child === null ||
        typeof child !== "object" ||
        Array.isArray(child) ||
        !("type" in child) ||
        typeof (child as { type: unknown }).type !== "string"
      ) {
        throw new PipelineError(
          "sf-geometry-invalid",
          path,
          "GeometryCollection members must be GeoJSON Geometry objects with a string type.",
        );
      }
      const c = child as { type: string; coordinates?: unknown; geometries?: unknown };
      // Push one leaf at a time — spread into push throws past the engine
      // argument limit on large nested GeometryCollections (#1344).
      const childLeaves = expandSfLeaves(
        {
          type: c.type,
          ...(c.coordinates !== undefined && { coordinates: c.coordinates }),
          ...(c.geometries !== undefined && { geometries: c.geometries }),
        },
        path,
        depth + 1,
      );
      for (const leaf of childLeaves) out.push(leaf);
    }
    return out;
  }
  // Validate leaf family (throws on Feature, CRS objects, etc.).
  sfKindOf(geom.type, path);
  return [{ type: geom.type, coordinates: geom.coordinates }];
}

/** Label points for a geometry: GeometryCollection expands to one point per leaf. */
export function representativePointsForGeometry(
  geom: SfParsed,
  path: string,
): readonly SfPosition[] {
  const leaves = expandSfLeaves(geom, path);
  const out: SfPosition[] = [];
  for (const leaf of leaves) {
    // Per-element push: MultiPoint / multi-part leaves can exceed the engine
    // argument limit when spread into push (#1344).
    for (const pt of representativePoints(leaf.type, leaf.coordinates)) out.push(pt);
  }
  return out;
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
 * One or more representative points for label placement (#809 phase 5).
 * Multi* geometries expand to **one point per part** (not only the first).
 * Degenerate / empty parts are skipped.
 */
export function representativePoints(type: string, coordinates: unknown): readonly SfPosition[] {
  if (type === "Point") return finitePoint(coordinates);
  if (type === "MultiPoint") return finitePoints(coordinates);
  if (type === "LineString") return linePoint(coordinates);
  if (type === "MultiLineString") return linePoints(coordinates);
  if (type === "Polygon") return polygonPoint(coordinates);
  if (type === "MultiPolygon") return polygonPoints(coordinates);
  return [];
}

function finitePoint(coordinates: unknown): readonly SfPosition[] {
  return isFinitePair(coordinates) ? [coordinates] : [];
}

function finitePoints(coordinates: unknown): readonly SfPosition[] {
  if (!Array.isArray(coordinates)) return [];
  return coordinates.filter((value): value is SfPosition => isFinitePair(value));
}

function linePoint(coordinates: unknown): readonly SfPosition[] {
  const point = meanPosition(ringPositions(coordinates));
  return point === null ? [] : [point];
}

function linePoints(coordinates: unknown): readonly SfPosition[] {
  if (!Array.isArray(coordinates)) return [];
  const out: SfPosition[] = [];
  for (const line of coordinates) {
    const point = meanPosition(ringPositions(line));
    if (point !== null) out.push(point);
  }
  return out;
}

function polygonPoint(coordinates: unknown): readonly SfPosition[] {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  const point = polygonCentroid(coordinates[0]);
  return point === null ? [] : [point];
}

function polygonPoints(coordinates: unknown): readonly SfPosition[] {
  if (!Array.isArray(coordinates)) return [];
  const out: SfPosition[] = [];
  for (const poly of coordinates) {
    if (!Array.isArray(poly) || poly.length === 0) continue;
    const point = polygonCentroid(poly[0]);
    if (point !== null) out.push(point);
  }
  return out;
}

export function geometryFieldName(params: { geometry?: string } | undefined): string {
  const g = params?.geometry;
  return g !== undefined && g !== "" ? g : "geometry";
}
