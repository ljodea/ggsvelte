/**
 * Factory for declaration-only guide components (#659 slice 6).
 *
 * Guides are keyed by AESTHETIC, so this family is five type shells that each
 * take a `channel` prop — not a 5×9 codegen matrix. The aesthetic is the key,
 * never part of the helper: `<GuideLegend channel="color" position="bottom"/>`
 * assembles `guides: { color: { type: "legend", position: "bottom" } }`.
 *
 * Same ADR 0001 contract as coord/facet/scale/labs: the shell passes a build
 * callback reading the live `$props()` proxy, and the registered layer's
 * `value` getter defers that read, so prop updates flow into the plot's derived
 * spec with zero re-registration.
 *
 * guides is a keyed-MERGE family, but the VALUE at a key is replaced whole —
 * `builder.guides` shallow-merges by channel, so a child never field-merges
 * into a prop's guide object.
 */
import type { GuidesSpec } from "@ggsvelte/spec";

import { registerPlotLayer } from "../geoms/registry.svelte.js";

/** Every aesthetic a guide can be keyed by. */
export type GuideChannel = keyof GuidesSpec;
/** Aesthetics an axis guide can key: the positional pair. */
export type PositionGuideChannel = Extract<GuideChannel, "x" | "y">;
/** Aesthetics a legend/colorbar/colorsteps guide can key. */
export type NonPositionGuideChannel = Exclude<GuideChannel, "x" | "y">;

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Same contract as the coord/facet/scale/labs factories' definedProps.
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
 * Split a shell's live props into the channel key and the guide options.
 *
 * Stripping `channel` here — rather than in each shell — is load-bearing:
 * every *GuideSpec is `additionalProperties: false`, so a leaked `channel` key
 * inside the guide object fails validate() rather than being ignored.
 */
export function splitChannel<Props extends { channel: GuideChannel }>(
  props: Props,
): { channel: GuideChannel; options: Omit<Props, "channel"> } {
  const { channel, ...options } = definedProps(props);
  return { channel, options };
}

/**
 * Register a guides plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass.
 */
export function createGuidesLayer(build: () => GuidesSpec): void {
  registerPlotLayer({
    kind: "guides",
    get value() {
      return build();
    },
  });
}
