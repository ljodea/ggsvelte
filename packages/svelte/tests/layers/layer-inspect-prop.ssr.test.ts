/**
 * `inspect={false}` on a geom component reaches the portable spec (#1065).
 *
 * The core opt-out is worthless to a component author if the prop stops at the
 * registry: the getting-started lesson is written in components, and the
 * portable spec it teaches has to carry the same intent as the JSON.
 */
import { describe, expect, it } from "vitest";

import { toLayerInput } from "../../src/lib/assembly/assemble.js";
import type { MarkLayerDescriptor } from "../../src/lib/layers/types.js";

const band: MarkLayerDescriptor = {
  geom: "rect",
  aes: { xmin: "from", xmax: "to", ymin: "low", ymax: "high" },
  inspect: false,
};

describe("layer inspect prop", () => {
  it("carries inspect: false into the layer input", () => {
    expect(toLayerInput(band)).toMatchObject({ geom: "rect", inspect: false });
  });

  it("omits the key entirely when the prop is not set", () => {
    const { inspect: _dropped, ...withoutInspect } = band;

    expect(toLayerInput(withoutInspect)).not.toHaveProperty("inspect");
  });

  it("omits the key when the prop is explicitly undefined", () => {
    // Svelte passes undefined for an absent prop, which must not become a
    // literal `inspect: undefined` in a spec that claims to be strict JSON.
    expect(toLayerInput({ ...band, inspect: undefined })).not.toHaveProperty("inspect");
  });
});
