/**
 * coord_radial Svelte surface re-exports and pipeline smoke.
 */
import { describe, expect, it } from "vitest";

import {
  aes,
  coord_polar,
  coord_radial,
  coordPolar,
  coordRadial,
  gg,
} from "../../src/lib/index.js";

describe("coord_radial Svelte surface", () => {
  it("re-exports helpers and aliases", () => {
    expect(coord_radial).toBe(coordRadial);
    expect(coord_polar).toBe(coordPolar);
    expect(coordRadial({ theta: "y", expand: false })).toEqual({
      type: "radial",
      theta: "y",
      expand: false,
    });
    expect(coordPolar()).toEqual({ type: "radial", clip: true });
  });

  it("builder emits radial coords that validate", () => {
    const spec = gg(
      [
        { pie: "all", cat: "a", n: 1 },
        { pie: "all", cat: "b", n: 2 },
      ],
      aes({ x: "pie", y: "n", fill: "cat" }),
    )
      .geomCol({ width: 1, position: "stack" })
      .coordRadial({ theta: "y", expand: false })
      .spec();
    expect(spec.coord).toEqual({ type: "radial", theta: "y", expand: false });
  });
});
