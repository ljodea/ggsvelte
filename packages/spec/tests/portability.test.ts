import { describe, expect, it } from "bun:test";

import {
  isPortable,
  portabilityIssues,
  toPortable,
  toPortableLossy,
  UnportableSpecError,
} from "../src/portability.ts";
import type { RuntimeSpec } from "../src/runtime.ts";

const portable: RuntimeSpec = {
  data: { values: [{ x: 1, cls: "a", ok: true, missing: null }] },
  layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "x" } } }],
};

describe("portabilityIssues", () => {
  it("accepts strictly-JSON specs", () => {
    expect(portabilityIssues(portable)).toEqual([]);
    expect(isPortable(portable)).toBe(true);
  });

  it("reports every offending path with a reason", () => {
    const spec = {
      layers: [
        {
          geom: "point",
          aes: { x: { fn: (row: Record<string, unknown>) => row["x"] }, y: { field: "y" } },
        },
      ],
      width: NaN,
      when: new Date(0),
      big: 1n,
      gone: undefined,
    } as unknown as RuntimeSpec;
    const issues = portabilityIssues(spec);
    const paths = issues.map((i) => i.path).toSorted();
    expect(paths).toEqual(["/big", "/gone", "/layers/0/aes/x/fn", "/when", "/width"]);
    expect(issues.find((i) => i.path === "/when")!.reason).toContain("ISO 8601");
  });

  it("detects cycles instead of hanging", () => {
    const spec: Record<string, unknown> = { layers: [{ geom: "point" }] };
    spec["self"] = spec;
    const issues = portabilityIssues(spec);
    expect(issues).toEqual([{ path: "/self", reason: "circular reference" }]);
  });
});

describe("isPortable early exit", () => {
  it("stops walking after the first issue", () => {
    let deepTouched = false;
    const bomb = {
      get x() {
        deepTouched = true;
        return 1;
      },
    };
    // `width` is visited before `data` in insertion order; NaN is unportable.
    const spec = {
      layers: [{ geom: "point" }],
      width: Number.NaN,
      data: { values: [bomb] },
    } as unknown as RuntimeSpec;

    expect(isPortable(spec)).toBe(false);
    expect(deepTouched).toBe(false);

    // Full enumeration still visits everything (and reports every path).
    deepTouched = false;
    const issues = portabilityIssues(spec);
    expect(deepTouched).toBe(true);
    expect(issues.some((i) => i.path === "/width")).toBe(true);
  });
});

describe("toPortable", () => {
  it("returns a deep copy for portable specs", () => {
    const copy = toPortable(portable);
    expect(copy).toEqual(portable as never);
    expect(copy).not.toBe(portable as never);
    expect(copy.layers).not.toBe(portable.layers as never);
  });

  it("REJECTS with every unserializable path (never strips)", () => {
    const spec = {
      layers: [{ geom: "point", aes: { x: { fn: () => 1 } } }],
      width: Infinity,
    } as unknown as RuntimeSpec;
    let error: UnportableSpecError | undefined;
    try {
      toPortable(spec);
    } catch (e) {
      error = e as UnportableSpecError;
    }
    expect(error).toBeInstanceOf(UnportableSpecError);
    expect(error!.issues.map((i) => i.path)).toEqual(["/layers/0/aes/x/fn", "/width"]);
    expect(error!.message).toContain("/layers/0/aes/x/fn");
  });
});

describe("toPortableLossy", () => {
  it("strips fn accessors and reports dropped paths", () => {
    const spec = {
      layers: [{ geom: "point", aes: { x: { fn: () => 1 }, y: { field: "y" } } }],
    } as unknown as RuntimeSpec;
    const { spec: out, dropped } = toPortableLossy(spec);
    expect(dropped).toEqual(["/layers/0/aes/x/fn"]);
    // the fn key is gone; the (now empty) channel object remains
    expect(out.layers[0]).toEqual({ geom: "point", aes: { x: {}, y: { field: "y" } } } as never);
  });

  it("coerces dates to ISO strings and non-finite numbers to null (not drops)", () => {
    const spec = {
      data: { values: [{ t: new Date("2026-07-10T00:00:00Z"), v: NaN }] },
      layers: [{ geom: "point" }],
    } as unknown as RuntimeSpec;
    const { spec: out, dropped } = toPortableLossy(spec);
    expect(dropped).toEqual([]);
    expect(out.data).toEqual({
      values: [{ t: "2026-07-10T00:00:00.000Z", v: null }],
    });
  });
});
