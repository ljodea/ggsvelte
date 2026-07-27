import { describe, expect, test } from "bun:test";

import {
  exampleIdFromGlobKey,
  indexExampleModulesById,
  requireExampleModule,
} from "../apps/docs/src/lib/example-module-index.js";

describe("exampleIdFromGlobKey", () => {
  test("extracts category/name from vite-style absolute paths", () => {
    expect(exampleIdFromGlobKey("/repo/examples/point/scatter-color/spec.ts", "spec.ts")).toBe(
      "point/scatter-color",
    );
    expect(
      exampleIdFromGlobKey(
        "/repo/examples/interaction/brush-zoom/Example.svelte",
        "Example.svelte",
      ),
    ).toBe("interaction/brush-zoom");
  });

  test("returns null when the path does not end with the leaf", () => {
    expect(exampleIdFromGlobKey("/repo/examples/point/scatter-color/data.ts", "spec.ts")).toBe(
      null,
    );
  });

  test("returns null when fewer than two path segments precede the leaf", () => {
    expect(exampleIdFromGlobKey("/scatter-color/spec.ts", "spec.ts")).toBe(null);
  });
});

describe("indexExampleModulesById", () => {
  test("maps each example id to its module value", () => {
    const table = {
      "/abs/examples/point/scatter-color/spec.ts": { id: "a" },
      "/abs/examples/line/multi-series/spec.ts": { id: "b" },
      "/abs/examples/point/scatter-color/data.ts": { id: "noise" },
    };
    const map = indexExampleModulesById(table, "spec.ts");
    expect(map.size).toBe(2);
    expect(map.get("point/scatter-color")).toEqual({ id: "a" });
    expect(map.get("line/multi-series")).toEqual({ id: "b" });
  });

  test("first Object.keys winner wins on duplicate ids (matches Array.find)", () => {
    // Object key order is insertion order for string keys.
    const table = {
      "/first/examples/point/scatter-color/spec.ts": "first",
      "/second/examples/point/scatter-color/spec.ts": "second",
    };
    const map = indexExampleModulesById(table, "spec.ts");
    expect(map.get("point/scatter-color")).toBe("first");
  });
});

describe("requireExampleModule", () => {
  test("returns the mapped module", () => {
    const map = indexExampleModulesById({ "/examples/bar/stacked/spec.ts": 42 }, "spec.ts");
    expect(requireExampleModule(map, "bar/stacked", "spec.ts")).toBe(42);
  });

  test("throws with the historical *suffix shape when missing", () => {
    const map = new Map<string, number>();
    expect(() => requireExampleModule(map, "missing/id", "spec.ts")).toThrow(
      "example module not found: */missing/id/spec.ts",
    );
  });
});

/** Historical linear pick — characterization oracle for Map parity. */
function legacyPick<T>(table: Record<string, T>, suffix: string): T | undefined {
  const key = Object.keys(table).find((k) => k.endsWith(suffix));
  return key === undefined ? undefined : table[key];
}

describe("index parity with legacy endsWith pick", () => {
  test("resolves the same module as pick for every id in a mixed-prefix table", () => {
    const table: Record<string, string> = {
      "/workspace/examples/point/scatter-color/spec.ts": "scatter",
      "/workspace/examples/line/multi-series/spec.ts": "multi",
      "/workspace/examples/interaction/brush-zoom/spec.ts": "brush",
      "/workspace/examples/point/scatter-color/data.ts": "noise",
    };
    const map = indexExampleModulesById(table, "spec.ts");
    for (const id of ["point/scatter-color", "line/multi-series", "interaction/brush-zoom"]) {
      expect(map.get(id)).toBe(legacyPick(table, `/${id}/spec.ts`));
    }
  });
});
