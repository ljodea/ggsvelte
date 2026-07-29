/**
 * GEOM_PARAM_KEYS (#1039) — param-key whitelist per geom.
 *
 * Precomputed from SpecDeclarations (`scripts/gen-reference-catalogs.ts`) so
 * createGeomLayer never loads TypeBox. Regenerate after schema param changes.
 */
import type { GeomName } from "./schema-catalog.js";
import { GEOM_PARAM_KEYS_DATA } from "./generated/geom-param-keys.js";

/**
 * Param property names per geom, derived from SpecDeclarations at gen time.
 * Empty array means the geom has no params object properties (e.g. blank).
 */
export const GEOM_PARAM_KEYS: Readonly<Record<GeomName, readonly string[]>> =
  GEOM_PARAM_KEYS_DATA as Readonly<Record<GeomName, readonly string[]>>;
