import { describe, expect, test } from "bun:test";

import {
  inferPlaygroundFields,
  parsePlaygroundData,
  PlaygroundDataError,
  recommendPlaygroundFields,
  PLAYGROUND_MAX_BYTES,
  PLAYGROUND_MAX_FIELDS,
  PLAYGROUND_MAX_FIELD_NAME_LENGTH,
  PLAYGROUND_MAX_ROWS,
} from "../apps/docs/src/lib/playground-data";

describe("playground data parser", () => {
  test("accepts a JSON array of flat records and reports its format", () => {
    const parsed = parsePlaygroundData('[{"city":"Bogotá","value":12},{"city":"Cali","value":9}]');

    expect(parsed).toEqual({
      format: "json",
      rows: [
        { city: "Bogotá", value: 12 },
        { city: "Cali", value: 9 },
      ],
    });
  });

  test("rejects executable, nested, malformed, and empty input with useful messages", () => {
    expect(() => parsePlaygroundData("")).toThrow("Paste a JSON array of rows");
    expect(() => parsePlaygroundData('{"x":1}')).toThrow("JSON data must be an array");
    expect(() => parsePlaygroundData('[{"x":{"nested":true}}]')).toThrow(
      'Row 1 field "x" must be a string, number, boolean, or null',
    );
    expect(() => parsePlaygroundData("alert(1)")).toThrow("is not valid JSON");
    expect(() => parsePlaygroundData("[]")).toThrow("at least one row");
  });

  test("bounds input bytes and row count before the chart can consume it", () => {
    expect(() => parsePlaygroundData("x".repeat(PLAYGROUND_MAX_BYTES + 1))).toThrow("is too large");
    const rows = Array.from({ length: PLAYGROUND_MAX_ROWS + 1 }, (_, index) => ({ x: index }));
    expect(() => parsePlaygroundData(JSON.stringify(rows))).toThrow("has too many rows");

    const wideRow = Object.fromEntries(
      Array.from({ length: PLAYGROUND_MAX_FIELDS + 1 }, (_, index) => [
        `field_${String(index)}`,
        index,
      ]),
    );
    expect(() => parsePlaygroundData(JSON.stringify([wideRow]))).toThrow("has too many fields");
  });

  test("rejects unsafe keys and exposes a stable actionable error contract", () => {
    let error: unknown;
    try {
      parsePlaygroundData('[{"constructor":"nope","value":1}]');
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(PlaygroundDataError);
    expect(error).toMatchObject({
      code: "UNSAFE_FIELD",
      fix: "Rename the field and apply the data again.",
    });
  });

  test("bounds field names and parse-error detail", () => {
    expect(() => parsePlaygroundData('[{"":1,"y":2}]')).toThrow("field names cannot be empty");
    expect(() => parsePlaygroundData('[{"bad\\nname":1,"y":2}]')).toThrow(
      "field names cannot contain control characters",
    );
    const longName = "x".repeat(PLAYGROUND_MAX_FIELD_NAME_LENGTH + 1);
    expect(() => parsePlaygroundData(JSON.stringify([{ [longName]: 1, y: 2 }]))).toThrow(
      "field name is too long",
    );

    try {
      parsePlaygroundData(`[${"{".repeat(1_000)}`);
    } catch (error) {
      expect((error as Error).message.length).toBeLessThan(300);
    }
  });

  test("infers stable field choices and recommends numeric axes", () => {
    const rows = [
      { species: "Adelie", mass: 3700, flipper: 181, tagged: true },
      { species: "Gentoo", mass: 5000, flipper: null, tagged: false },
    ];

    expect(inferPlaygroundFields(rows)).toEqual([
      { name: "species", kind: "text" },
      { name: "mass", kind: "number" },
      { name: "flipper", kind: "number" },
      { name: "tagged", kind: "boolean" },
    ]);
    expect(recommendPlaygroundFields(inferPlaygroundFields(rows))).toEqual({
      x: "mass",
      y: "flipper",
      color: "species",
      key: "",
    });
    expect(
      recommendPlaygroundFields([
        { name: "category", kind: "text" },
        { name: "value", kind: "number" },
      ]),
    ).toEqual({ x: "category", y: "value", color: "category", key: "" });
  });
});
