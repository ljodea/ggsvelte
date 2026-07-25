/**
 * Factory for the declaration-only <Legend> grammar layer (#659 slice 6).
 *
 * NOT the interaction runtime. The rest of this directory (filter, focus,
 * targets) implements legend INTERACTION — click-to-filter, focus emphasis,
 * entry key indexing. This file and Legend.svelte are the grammar half: they
 * only contribute `LegendSpec` to the PortableSpec, and nothing here reads or
 * writes interaction state.
 *
 * Same ADR 0001 contract as coord/facet/scale/labs/guides: the shell passes a
 * build callback reading the live `$props()` proxy, and the registered layer's
 * `value` getter defers that read.
 */
import type { LegendSpec } from "@ggsvelte/spec";

import { registerPlotLayer } from "../geoms/registry.svelte.js";

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Same contract as the coord/facet/scale/labs/guides factories' definedProps.
 */
export function definedProps<T extends object>(props: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    const value = (props as Record<string, unknown>)[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * Register a legend plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass.
 */
export function createLegendLayer(build: () => LegendSpec): void {
  registerPlotLayer({
    kind: "legend",
    get value() {
      return build();
    },
  });
}
