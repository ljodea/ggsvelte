/**
 * Lossy RuntimeSpec → PortableSpec tooling conversion.
 * Strict checks: portability-check.test.ts.
 * Production: portability-lossy.ts via portability.ts facade.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { toPortableLossy } from "../src/portability.ts";
import type { RuntimeSpec } from "../src/runtime.ts";

describe("toPortableLossy", () => {
  it("strips fn accessors and reports dropped paths", () => {
    const spec = fromAny<RuntimeSpec>({
      layers: [{ geom: "point", aes: { x: { fn: () => 1 }, y: { field: "y" } } }],
    });
    const { spec: out, dropped } = toPortableLossy(spec);
    expect(dropped).toEqual(["/layers/0/aes/x/fn"]);
    // the fn key is gone; the (now empty) channel object remains
    expect(out.layers[0]).toEqual({ geom: "point", aes: { x: {}, y: { field: "y" } } });
  });

  it("coerces dates to ISO strings and non-finite numbers to null (not drops)", () => {
    const spec = fromAny<RuntimeSpec>({
      data: { values: [{ t: new Date("2026-07-10T00:00:00Z"), v: NaN }] },
      layers: [{ geom: "point" }],
    });
    const { spec: out, dropped } = toPortableLossy(spec);
    expect(dropped).toEqual([]);
    expect(out.data).toEqual({
      values: [{ t: "2026-07-10T00:00:00.000Z", v: null }],
    });
  });
});
