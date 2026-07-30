/**
 * Default row identity for durable interaction — pure resolve.
 *
 * Authors should not pass GGPlot `key` for ordinary charts: prefer an `id`
 * column when present, otherwise stable row index. Explicit `key` overrides.
 */
import { describe, expect, it } from "vitest";

import {
  identityFromInspectInput,
  identityFromSelectInput,
  pickExplicitDatumKey,
  resolveDatumKey,
} from "../../src/lib/runtime/resolve-datum-key.js";

describe("resolveDatumKey", () => {
  it("uses an explicit column name when provided", () => {
    expect(
      resolveDatumKey({
        explicit: "year",
        data: [{ year: 2020, id: "x" }],
      }),
    ).toBe("year");
  });

  it("uses an explicit accessor when provided", () => {
    const accessor = (row: { a: number }, index: number) => `${row.a}:${index}`;
    expect(resolveDatumKey({ explicit: accessor, data: [] })).toBe(accessor);
  });

  it("defaults to the id column when row objects expose a PropertyKey id", () => {
    expect(
      resolveDatumKey({
        data: [
          { id: "adelie-001", species: "Adelie" },
          { id: "adelie-002", species: "Adelie" },
        ],
      }),
    ).toBe("id");
  });

  it("defaults to the id column for column-oriented { columns: { id } } data", () => {
    expect(
      resolveDatumKey({
        data: {
          columns: {
            id: ["a", "b"],
            x: [1, 2],
          },
        },
      }),
    ).toBe("id");
  });

  it("defaults to the id column for DataRef { values }", () => {
    expect(
      resolveDatumKey({
        data: {
          values: [
            { id: 1, x: 0 },
            { id: 2, x: 1 },
          ],
        },
      }),
    ).toBe("id");
  });

  it("defaults to a row-index accessor when no id field is available", () => {
    const key = resolveDatumKey({
      data: [
        { manufacturer: "audi", model: "a4", hwy: 29 },
        { manufacturer: "audi", model: "a4", hwy: 29 },
      ],
    });
    expect(typeof key).toBe("function");
    if (typeof key !== "function") throw new Error("expected index accessor");
    expect(key({ manufacturer: "audi", model: "a4", hwy: 29 }, 0)).toBe(0);
    expect(key({ manufacturer: "audi", model: "a4", hwy: 29 }, 1)).toBe(1);
  });

  it("defaults to a row-index accessor when data is empty or absent", () => {
    const empty = resolveDatumKey({ data: [] });
    const missing = resolveDatumKey({});
    expect(typeof empty).toBe("function");
    expect(typeof missing).toBe("function");
    if (typeof empty !== "function" || typeof missing !== "function")
      throw new Error("expected index accessors");
    expect(empty({}, 3)).toBe(3);
    expect(missing({}, 7)).toBe(7);
  });

  it("does not treat a non-PropertyKey id as an identity column", () => {
    const key = resolveDatumKey({
      data: [{ id: { nested: true }, x: 1 }],
    });
    expect(typeof key).toBe("function");
  });

  it("prefers explicit key over an auto id column", () => {
    expect(
      resolveDatumKey({
        explicit: "year",
        data: [{ id: "row-1", year: 812 }],
      }),
    ).toBe("year");
  });
});

describe("pickExplicitDatumKey", () => {
  it("prefers inspect identity over select, controller, and legacy key", () => {
    expect(
      pickExplicitDatumKey({
        inspect: "year",
        select: "country",
        controller: "id",
        legacy: "region",
      }),
    ).toBe("year");
  });

  it("prefers select identity over controller and legacy when inspect is absent", () => {
    expect(
      pickExplicitDatumKey({
        select: "country",
        controller: "id",
        legacy: "region",
      }),
    ).toBe("country");
  });

  it("prefers controller identity over legacy plot key", () => {
    expect(
      pickExplicitDatumKey({
        controller: "id",
        legacy: "region",
      }),
    ).toBe("id");
  });

  it("falls back to legacy GGPlot key when no interaction surface sets identity", () => {
    expect(pickExplicitDatumKey({ legacy: "region" })).toBe("region");
  });

  it("returns undefined when no surface provides identity", () => {
    expect(pickExplicitDatumKey({})).toBeUndefined();
  });

  it("treats only undefined as absent — allows accessor functions", () => {
    const accessor = (row: { a: number }, index: number) => `${row.a}:${index}`;
    expect(pickExplicitDatumKey({ inspect: accessor })).toBe(accessor);
  });
});

describe("identityFromInspectInput", () => {
  it("returns undefined for absent, false, or true inspect", () => {
    expect(identityFromInspectInput()).toBeUndefined();
    expect(identityFromInspectInput(false)).toBeUndefined();
    expect(identityFromInspectInput(true)).toBeUndefined();
  });

  it("reads identity from an InspectOptions bag", () => {
    expect(identityFromInspectInput({ identity: "year", mode: "xy" })).toBe("year");
  });
});

describe("identityFromSelectInput", () => {
  it("returns undefined for absent, false, or string shorthand", () => {
    expect(identityFromSelectInput()).toBeUndefined();
    expect(identityFromSelectInput(false)).toBeUndefined();
    expect(identityFromSelectInput("point")).toBeUndefined();
  });

  it("reads identity from a SelectOptions bag", () => {
    expect(identityFromSelectInput({ type: "point", identity: "country" })).toBe("country");
  });
});
