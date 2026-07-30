/**
 * Browser-lane coverage for pure plot-props helpers.
 * resolveCapabilities also has an SSR characterization suite; CI coverage
 * only collects under the chromium project.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import {
  readLegacyPlotLegendFilter,
  readLegacyPlotLegendFocus,
  resolveCapabilities,
  widenPlotProps,
  type GGPlotProps,
} from "../src/lib/plot-props.js";

describe("resolveCapabilities", () => {
  it("defaults omitted capability props to false", () => {
    expect(resolveCapabilities({})).toEqual({
      inspect: false,
      select: false,
      zoom: false,
      legendFocus: false,
      legendFilter: false,
    });
  });

  it("preserves object-form config identity", () => {
    const inspect = { muteSiblings: true as const };
    const select = "point" as const;
    const zoom = true as const;
    const legendFocus = { preview: false as const };
    const legendFilter = true as const;
    const resolved = resolveCapabilities({
      inspect,
      select,
      zoom,
      legendFocus,
      legendFilter,
    });
    expect(resolved.inspect).toBe(inspect);
    expect(resolved.select).toBe(select);
    expect(resolved.zoom).toBe(zoom);
    expect(resolved.legendFocus).toBe(legendFocus);
    expect(resolved.legendFilter).toBe(legendFilter);
  });
});

describe("readLegacyPlotLegendFocus / Filter", () => {
  it("returns the deprecated plot-level legend props when present", () => {
    /* oxlint-disable typescript/no-deprecated -- dual-read window under test */
    const props: GGPlotProps = {
      legendFocus: { preview: true },
      legendFilter: true,
    };
    expect(readLegacyPlotLegendFocus(props)).toEqual({ preview: true });
    expect(readLegacyPlotLegendFilter(props)).toBe(true);
    expect(readLegacyPlotLegendFocus({})).toBeUndefined();
    expect(readLegacyPlotLegendFilter({})).toBeUndefined();
    /* oxlint-enable typescript/no-deprecated */
  });
});

describe("widenPlotProps", () => {
  it("forwards the six PublicKey fields and other props through the proxy", () => {
    const key = (row: { id: string }) => row.id;
    // Stand-in controller — intentionally not a full PlotInteractionController.
    const interaction = fromAny({ revision: 0 });
    const oninspect = (): void => {
      // no-op callback identity for proxy forwarding
    };
    const onselect = (): void => {
      // no-op
    };
    const onlegendfocus = (): void => {
      // no-op
    };
    const oninteraction = (): void => {
      // no-op
    };
    const props: GGPlotProps<{ id: string; x: number }> = {
      data: [{ id: "a", x: 1 }],
      height: 320,
      key,
      interaction,
      oninspect,
      onselect,
      onlegendfocus,
      oninteraction,
    };
    const widened = widenPlotProps(props);
    // Six widened fields.
    expect(widened.key).toBe(key);
    expect(widened.interaction).toBe(interaction);
    expect(widened.oninspect).toBe(oninspect);
    expect(widened.onselect).toBe(onselect);
    expect(widened.onlegendfocus).toBe(onlegendfocus);
    expect(widened.oninteraction).toBe(oninteraction);
    // Non-widened fields via Reflect.get.
    expect(widened.height).toBe(320);
    expect(widened.data).toEqual([{ id: "a", x: 1 }]);
  });
});
