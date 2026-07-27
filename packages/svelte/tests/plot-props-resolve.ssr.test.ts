/**
 * #1040: capability defaults own one pure owner (`resolveCapabilities`).
 * Seam: plot-props resolve helpers — no runes, no engine.
 */
import { describe, expect, it } from "vitest";

import { resolveCapabilities } from "../src/lib/plot-props.js";

describe("resolveCapabilities", () => {
  it("defaults the five capability props to false when omitted", () => {
    expect(resolveCapabilities({})).toEqual({
      inspect: false,
      select: false,
      zoom: false,
      legendFocus: false,
      legendFilter: false,
    });
  });

  it("passes through explicit false and true", () => {
    expect(
      resolveCapabilities({
        inspect: false,
        select: true,
        zoom: false,
        legendFocus: true,
        legendFilter: false,
      }),
    ).toEqual({
      inspect: false,
      select: true,
      zoom: false,
      legendFocus: true,
      legendFilter: false,
    });
  });

  it("passes through object-form capability configs without cloning", () => {
    const inspect = { muteSiblings: true as const };
    const select = "point" as const;
    const zoom = true as const;
    const legendFocus = { preview: true as const };
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
