/**
 * Characterization tests for TypeBox 1.x → agent SpecError mapping
 * (validate-map-errors.ts + validate-map-forms.ts + validate-schema-walk.ts).
 *
 * Exercises mapValueErrors classification through the public validate() entry.
 * Snapshot-tested agent messages remain in validate.test.ts (full orchestrator
 * product surface).
 */
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

function errorsOf(input: unknown) {
  const result = validate(input);
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

describe("validate — TypeBox 1.x error mapping (Codex P2 regressions)", () => {
  it("nested channel constant type stays a value error, not invalid-channel-value", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { value: {} } } }],
    });
    expect(errors.some((e) => e.code === "invalid-channel-value")).toBe(false);
    expect(errors.some((e) => e.path === "/layers/0/aes/x/value")).toBe(true);
    expect(errors.find((e) => e.path === "/layers/0/aes/x/value")?.code).toBe("invalid-type");
  });

  it("bad inline data cell is not invalid-data re-wrap or unexpected-property", () => {
    const errors = errorsOf({
      data: { values: [{ x: {} }] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-data")).toBe(false);
    expect(errors.some((e) => e.code === "unexpected-property" && e.path.includes("/x"))).toBe(
      false,
    );
    expect(errors.some((e) => e.path === "/data/values/0/x" && e.code === "invalid-type")).toBe(
      true,
    );
  });

  it("theme object with extra key reports unexpected-property, not theme-name enum", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      theme: { name: "dark", accent: "#f00", extra: true },
    });
    expect(errors.some((e) => e.code === "invalid-enum-value")).toBe(false);
    expect(errors.some((e) => e.code === "unexpected-property" && e.path === "/theme/extra")).toBe(
      true,
    );
  });

  it("invalid theme string still reports invalid-enum-value with allowed names", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      theme: "not-a-theme",
    });
    expect(errors.some((e) => e.code === "invalid-enum-value" && e.path === "/theme")).toBe(true);
    expect(errors.find((e) => e.path === "/theme")?.allowed?.length).toBeGreaterThan(4);
  });

  it("TypeBox maxErrors is raised so multi-field failures exceed the default 8", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      theme: "nope",
      coord: { type: "nope" },
      labs: {
        title: 1,
        subtitle: 2,
        x: 3,
        y: 4,
        color: 5,
        fill: 6,
        caption: 7,
      },
    });
    // Default TypeBox maxErrors is 8; with Settings raised we keep more mapped diagnostics.
    expect(errors.length).toBeGreaterThan(8);
    expect(errors.some((e) => e.path === "/labs/caption")).toBe(true);
  });

  it("near-canonical channel with a typo key reports unexpected-property", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { field: "x", fielld: true } } }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some((e) => e.code === "unexpected-property" && e.path === "/layers/0/aes/x/fielld"),
    ).toBe(true);
  });

  it("value channel with an extra key reports only the extra key", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { value: 1, foo: 2 } } }],
    });
    expect(
      errors.some((e) => e.code === "unexpected-property" && e.path === "/layers/0/aes/x/foo"),
    ).toBe(true);
    expect(errors.some((e) => e.path === "/layers/0/aes/x/value")).toBe(false);
  });

  it("mixed channel forms (field+value) report invalid-channel-value, not root invalid-type", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { field: "x", value: 1 } } }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some(
        (e) =>
          e.code === "invalid-channel-value" &&
          e.path === "/layers/0/aes/x" &&
          e.message.includes("mixes"),
      ),
    ).toBe(true);
  });

  it("field form with scale (ValueRef-only key) reports unexpected-property", () => {
    const errors = errorsOf({
      layers: [{ geom: "point", aes: { x: { field: "x", scale: true } } }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some((e) => e.code === "unexpected-property" && e.path === "/layers/0/aes/x/scale"),
    ).toBe(true);
  });

  it("wrapped data with an extra sibling key reports unexpected-property", () => {
    const errors = errorsOf({
      data: { values: [], rows: [] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(errors.some((e) => e.code === "unexpected-property" && e.path === "/data/rows")).toBe(
      true,
    );
  });

  it("named data with an extra key reports only the extra key", () => {
    const errors = errorsOf({
      data: { name: "cars", rows: [] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "unexpected-property" && e.path === "/data/rows")).toBe(
      true,
    );
    expect(errors.some((e) => e.path === "/data/name")).toBe(false);
  });

  it("mixed data forms (values+name) report invalid-data, not root invalid-type", () => {
    const errors = errorsOf({
      data: { values: [], name: "cars" },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some(
        (e) => e.code === "invalid-data" && e.path === "/data" && e.message.includes("mixes forms"),
      ),
    ).toBe(true);
  });

  it("dataset entries reject named references with a property diagnostic", () => {
    const errors = errorsOf({
      datasets: { cars: { name: "cars" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(
      errors.some((e) => e.code === "unexpected-property" && e.path === "/datasets/cars/name"),
    ).toBe(true);
  });

  it("mixed data forms (columns+values) report invalid-data mixes forms", () => {
    const errors = errorsOf({
      data: { columns: { x: [1] }, values: [] },
      layers: [{ geom: "point" }],
    });
    expect(errors.some((e) => e.code === "invalid-type" && e.path === "")).toBe(false);
    expect(errors.some((e) => e.code === "invalid-data" && e.message.includes("mixes forms"))).toBe(
      true,
    );
  });

  it("explicit undefined on optional props is rejected (exactOptionalPropertyTypes)", () => {
    const errors = errorsOf({
      layers: [{ geom: "point" }],
      width: undefined,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.path === "/width" || e.code === "invalid-type")).toBe(true);
  });
});
