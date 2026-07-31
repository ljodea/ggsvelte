/**
 * Lean portable builder entry (`@ggsvelte/spec/portable`).
 *
 * Exports the fluent builder without TypeBox: `.spec()` is an alias of
 * `.toPortable()` (normalize only). Use this from chart render bundles;
 * keep `@ggsvelte/spec` + `.spec()` / `validate()` for agent authoring.
 */
import type { AesInput } from "./normalize.js";
import { toAuthoringDataRef, type DataInput } from "./builder-data.js";
import { GGBuilderCore } from "./builder-core.js";
import { WithBuilderGeoms } from "./builder-geoms.js";
import { WithBuilderScales } from "./builder-scales.js";
import type { PortableSpec } from "./schema.js";

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
  GeomHistogramOptions,
  GeomLineOptions,
  GeomPointOptions,
  GeomSmoothOptions,
  GeomTextOptions,
} from "./builder-options.js";

export { normalize } from "./normalize.js";
export type { AesInput, SpecInput } from "./normalize.js";

/** Identity helper for aesthetic mappings (same as full package `aes`). */
export function aes(mapping: AesInput): AesInput {
  return mapping;
}

/**
 * Portable builder: `.spec()` and `.toPortable()` both normalize only.
 * Full schema validation: import `validate` from `@ggsvelte/spec`.
 */
export class GGBuilder extends WithBuilderScales(WithBuilderGeoms(GGBuilderCore)) {
  /** Normalize-only finish (TypeBox-free). Alias of {@link toPortable}. */
  spec(): PortableSpec {
    return this.toPortable();
  }
}

/** Start a plot for render paths: gg(data, aes(...)).geomPoint().spec(). */
export function gg(data?: DataInput, mapping?: AesInput): GGBuilder {
  return new GGBuilder({
    ...(data !== undefined && { data: toAuthoringDataRef(data) }),
    ...(mapping !== undefined && { aes: mapping }),
    layers: [],
  });
}
