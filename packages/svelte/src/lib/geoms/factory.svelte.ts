/**
 * Factory for declaration-only geom components (decision 0001, mechanism A).
 *
 * Every <GeomX> component is a thin shell: it destructures nothing, passes
 * its live `$props()` proxy plus the geom's param-key list here, and this
 * factory registers a layer descriptor whose getters read the proxy — so
 * prop updates flow into the plot's derived spec without re-registration.
 *
 * Init-time registration only (never in $effect); inert without a <GGPlot>
 * ancestor; unregisters on destroy (all measured in the M0a-1 spike).
 */
import type {
  AesInput,
  DataInput,
  GeomName,
  PositionName,
  PositionParams,
  RenderBackend,
  StatName,
} from "@ggsvelte/spec";

import { registerLayer } from "./registry.svelte.js";

export interface GeomProps {
  /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
  aes?: AesInput;
  /** Optional layer-local data (#589); inherits plot data when omitted. */
  data?: DataInput | readonly Record<string, unknown>[];
  /** Stat override (geoms with more than one stat, e.g. errorbar summary). */
  stat?: StatName;
  /** Position override (per-geom subset; normalize/validate enforce it). */
  position?: PositionName;
  /** Jitter/nudge parameters (point/text layers). */
  positionParams?: PositionParams;
  /** Rendering backend hint ("svg" | "canvas" | "auto"). */
  render?: RenderBackend;
}

/**
 * Register a geom layer from a component's live props proxy (passed as an
 * accessor so the proxy is only ever read lazily, inside the descriptor's
 * getters). `paramKeys` whitelists which props become layer params;
 * aes/stat/position/positionParams travel structurally.
 */
export function createGeomLayer<P extends GeomProps>(
  geom: GeomName,
  getProps: () => P,
  paramKeys: readonly (keyof P & string)[],
): void {
  registerLayer({
    geom,
    get stat() {
      return getProps().stat;
    },
    get aes() {
      return getProps().aes;
    },
    get data() {
      return getProps().data;
    },
    get position() {
      return getProps().position;
    },
    get positionParams() {
      return getProps().positionParams;
    },
    get render() {
      return getProps().render;
    },
    get params() {
      const props = getProps() as Record<string, unknown>;
      const params: Record<string, unknown> = {};
      for (const key of paramKeys) {
        const value = props[key];
        if (value !== undefined) params[key] = value;
      }
      return Object.keys(params).length > 0 ? params : undefined;
    },
  });
}
