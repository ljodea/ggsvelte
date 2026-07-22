/**
 * The fluent builder — one of the three surfaces that compile to the same
 * PortableSpec (spec-first design; builder and Svelte components are sugar).
 *
 * - `gg(data, aes(...))` returns an immutable builder: every method returns a
 *   NEW builder (the spec is the explicit first-class value — Hadley lesson 1;
 *   no `+` operator, no mutation).
 * - `.layer({ geom, ... })` is the canonical method (one layer concept —
 *   Hadley lesson 2); `.geomPoint()` / `.geomBar()` / ... are documented
 *   sugar for it.
 * - `.spec()` normalizes and VALIDATES, returning a canonical PortableSpec or
 *   throwing SpecValidationError. Builder output therefore always validates
 *   against the published JSON Schema (property-tested).
 *
 * Implementation:
 *  - builder-data.ts — Date snapshot / portable ISO materialization
 *  - builder-options.ts — Geom*Options types
 *  - builder-core.ts — state, geom/facet/coord/labs/theme/spec
 *  - builder-scales.ts — scaleX/Y/Color/Fill sugar mixin
 */
import type { AesInput } from "./normalize.js";
import { toAuthoringDataRef, type DataInput } from "./builder-data.js";
import { GGBuilderCore } from "./builder-core.js";
import { WithBuilderScales } from "./builder-scales.js";

export type {
  AuthoringCellValue,
  AuthoringColumns,
  AuthoringDataRef,
  AuthoringRows,
  DataInput,
} from "./builder-data.js";

export type {
  GeomAreaOptions,
  GeomBarOptions,
  GeomBoxplotOptions,
  GeomColOptions,
  GeomDensityOptions,
  GeomErrorbarOptions,
  GeomHistogramOptions,
  GeomLineOptions,
  GeomPointOptions,
  GeomRuleOptions,
  GeomSmoothOptions,
  GeomTextOptions,
} from "./builder-options.js";

/**
 * Identity helper for aesthetic mappings, mirroring ggplot2's aes(). Accepts
 * the bare-string shorthand ('displ' means { field: 'displ' }); the shorthand
 * is canonicalized away by normalize() and never reaches the JSON Schema.
 */
export function aes(mapping: AesInput): AesInput {
  return mapping;
}

/** Immutable plot builder. Construct with gg(); finish with .spec(). */
export class GGBuilder extends WithBuilderScales(GGBuilderCore) {}

/** Start a plot: gg(data, aes({ x: 'displ', y: 'hwy' })).geomPoint().spec(). */
export function gg(data?: DataInput, mapping?: AesInput): GGBuilder {
  return new GGBuilder({
    ...(data !== undefined && { data: toAuthoringDataRef(data) }),
    ...(mapping !== undefined && { aes: mapping }),
    layers: [],
  });
}
