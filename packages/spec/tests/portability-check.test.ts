/**
 * Strict portability checks: portabilityIssues, isPortable, toPortable.
 * Lossy tooling conversion: portability-lossy.test.ts.
 * Production: portability-check.ts via portability.ts facade.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import {
  isPortable,
  portabilityIssues,
  toPortable,
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
    // Intentionally unportable values (fn, Date, bigint, NaN, undefined).
    const spec = fromAny<RuntimeSpec>({
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
    });
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
  it("stops walking after the first issue without reading later getters", () => {
    let laterTouched = false;
    // Sibling getter after the unportable property: Object.entries would
    // evaluate it before the loop, defeating stopAfter. Keys must be read lazily.
    const spec = fromAny<RuntimeSpec>({
      layers: [{ geom: "point" }],
      width: Number.NaN,
      get later() {
        laterTouched = true;
        return 1;
      },
    });

    expect(isPortable(spec)).toBe(false);
    expect(laterTouched).toBe(false);

    // Full enumeration still visits every path (and runs the getter).
    laterTouched = false;
    const issues = portabilityIssues(spec);
    expect(laterTouched).toBe(true);
    expect(issues.some((i) => i.path === "/width")).toBe(true);
  });

  it("does not report own properties deleted by an earlier getter", () => {
    // Matches Object.entries / JSON semantics: a key removed mid-walk is omitted,
    // not reported as undefined.
    const spec: Record<string, unknown> = {
      layers: [{ geom: "point" }],
    };
    Object.defineProperty(spec, "a", {
      enumerable: true,
      configurable: true,
      get() {
        delete spec["b"];
        return 1;
      },
    });
    Object.defineProperty(spec, "b", {
      enumerable: true,
      configurable: true,
      value: 2,
      writable: true,
    });
    expect(portabilityIssues(spec)).toEqual([]);
    expect(isPortable(fromAny(spec))).toBe(true);
  });
});

describe("toPortable", () => {
  it("returns a deep copy for portable specs", () => {
    const copy = toPortable(portable);
    expect(copy).toEqual(portable);
    expect(copy).not.toBe(portable);
    expect(copy.layers).not.toBe(portable.layers);
  });

  it("REJECTS with every unserializable path (never strips)", () => {
    const spec = fromAny<RuntimeSpec>({
      layers: [{ geom: "point", aes: { x: { fn: () => 1 } } }],
      width: Infinity,
    });
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
