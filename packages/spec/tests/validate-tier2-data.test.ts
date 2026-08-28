/**
 * Tier-2 data-aware checks: inline data (first block — field/type mismatches, style scales, constants).
 * Binned breaks/domain (#599) + censor recovery: validate-tier2-data-breaks.test.ts.
 * DataProfile + input limits: validate-tier2-data-profile.test.ts.
 * Temporal decision reuse: validate-tier2-temporal-reuse.test.ts (reuse) + validate-tier2-temporal-position.test.ts (scales).
 * Production: validate-data*.ts (style: validate-data-checks-style.ts).
 */
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

const rows = [
  { city: "Berlin", temp: 21.5, when: "2026-01-01", note: null },
  { city: "Oslo", temp: -3.2, when: "2026-01-02", note: null },
];

function errorsOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  const result = validate(input, options ?? {});
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

function codesOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  return errorsOf(input, options).map((e) => e.code);
}

describe("tier 2 — data-aware checks (inline data)", () => {
  const base = {
    data: { values: rows },
    aes: { x: { field: "city" }, y: { field: "temp" } },
  };

  it("accepts a valid spec against inline data", () => {
    expect(validate({ ...base, layers: [{ geom: "point" }] }, {}).ok).toBe(true);
  });

  it("unknown field gets a did-you-mean", () => {
    const errors = errorsOf({
      ...base,
      aes: { x: { field: "cty" }, y: { field: "temp" } },
      layers: [{ geom: "point" }],
    });
    expect(errors[0]?.code).toBe("unknown-field");
    expect(errors[0]?.message).toContain('Did you mean "city"?');
    expect(errors[0]?.fix?.example).toEqual({ field: "city" });
  });

  it("all-null columns are tier-2 errors", () => {
    expect(
      codesOf({
        ...base,
        aes: { x: { field: "city" }, y: { field: "note" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["all-null-column"]);
  });

  it("{stat} channels must name a generated column", () => {
    const errors = errorsOf({
      ...base,
      aes: { x: { field: "city" }, y: { stat: "density" } },
      layers: [{ geom: "bar" }],
    });
    expect(errors[0]?.code).toBe("unknown-stat-column");
    expect(errors[0]?.allowed).toEqual(["count"]);
    expect(
      codesOf({
        ...base,
        aes: { x: { field: "city" }, y: { stat: "count" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["unknown-stat-column"]); // identity generates no columns
  });

  it("scale/type mismatches: time needs temporal, log refuses nominal, sequential refuses nominal", () => {
    expect(
      codesOf({
        ...base,
        scales: { x: { type: "time" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["scale-type-mismatch"]);
    expect(
      codesOf({
        ...base,
        scales: { x: { type: "log" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["scale-type-mismatch"]);
    expect(
      validate(
        {
          ...base,
          aes: { x: { field: "when" }, y: { field: "temp" } },
          scales: { x: { type: "time" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
    expect(
      codesOf({
        ...base,
        aes: { ...base.aes, color: { field: "city" } },
        scales: { color: { type: "sequential" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["scale-type-mismatch"]);
  });
  it("treats viridis as sequential and suggests a complete repair when type is omitted", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, color: { field: "city" } },
      scales: { color: { scheme: "viridis" } },
      layers: [{ geom: "point" }],
    });

    expect(errors.map((error) => error.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain('scheme is "viridis"');
    expect(errors[0]?.fix?.description).toContain("categorical scheme");
    expect(errors[0]?.fix?.description).not.toContain('type to "ordinal"');
    expect(errors[0]?.fix?.example).toEqual({ scheme: "observable10" });
  });

  it("lets an explicit range defer omitted-type inference to the mapped data", () => {
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, color: { field: "city" } },
          scales: { color: { scheme: "viridis", range: ["#123456"] } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  // A finite style (shape/linetype) with an inferred continuous field cannot
  // interpolate; the fix must steer temporal fields to "ordinal" (binned finite
  // styles reject non-numeric values at runtime) but quantitative to "binned".
  it("suggests ordinal (not binned) for a temporal finite-style field", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, shape: { field: "when" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.fix?.example).toEqual({ type: "ordinal" });
    expect(errors[0]?.fix?.description).toContain("ordinal");
    expect(errors[0]?.fix?.description).not.toContain('"binned"');
  });

  it("keeps the binned suggestion for a quantitative finite-style field", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, shape: { field: "temp" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.fix?.example).toEqual({ type: "binned" });
  });

  // A sequential/binned numeric style (size/linewidth/alpha) needs quantitative
  // or temporal values; a nominal field trains no finite domain and the runtime
  // throws style-domain-empty, so reject it at validation time like color does.
  it("rejects a nominal field on a sequential numeric style scale", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { field: "city" } },
      scales: { size: { type: "sequential" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain('field "city" is nominal');
    expect(errors[0]?.fix?.example).toEqual({ type: "ordinal" });
  });

  it("rejects a nominal field on a binned alpha scale", () => {
    expect(
      codesOf({
        ...base,
        aes: { ...base.aes, alpha: { field: "city" } },
        scales: { alpha: { type: "binned" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["scale-type-mismatch"]);
  });

  it("accepts quantitative and temporal fields on sequential numeric styles", () => {
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "temp" } },
          scales: { size: { type: "sequential" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "when" } },
          scales: { size: { type: "sequential", temporalKind: "date" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("defers a temporal-parse-requesting nominal field to runtime resolution", () => {
    // A nominal column with explicit temporal-parse options may resolve to
    // temporal at scale-resolution time; the numeric-style check must not
    // false-positive here (mirrors the color checker's requestsTemporal skip).
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "city" } },
          scales: { size: { type: "sequential", parse: "dmy" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);

    // The default (no explicit sequential/binned type) infers an ordinal numeric
    // style for a nominal field — no error.
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "city" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  // A numeric style requesting temporal semantics over a quantitative (number)
  // column with no working epoch parser auto-detects as non-temporal and throws
  // style-temporal-parse at runtime; reject at validation time like color does,
  // instead of the previous unconditional temporal skip.
  it("rejects a quantitative field on a temporal numeric style without a parser", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: { size: { type: "sequential", temporalKind: "date" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain("quantitative");
  });

  it("accepts a quantitative field on a temporal numeric style with a working epoch parser", () => {
    // A working parser resolves the numeric column to temporal, so the check
    // must keep deferring (mirrors the color checker's parser deferral).
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "temp" } },
          scales: { size: { type: "sequential", parse: { epoch: "seconds" } } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  // The runtime trains numeric style scales on scaled constants too, so a scaled
  // string constant on a sequential/binned scale throws style-domain-empty; the
  // check must cover scaled constants, not only mapped fields.
  it("rejects a scaled string constant on a sequential numeric style scale", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { value: "large", scale: true } },
      scales: { size: { type: "sequential" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain("large");
  });

  it("rejects a scaled string constant on a binned alpha scale", () => {
    expect(
      codesOf({
        ...base,
        aes: { ...base.aes, alpha: { value: "big", scale: true } },
        scales: { alpha: { type: "binned" } },
        layers: [{ geom: "point" }],
      }),
    ).toEqual(["scale-type-mismatch"]);
  });

  it("accepts a numeric scaled constant on a sequential numeric style scale", () => {
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { value: 5, scale: true } },
          scales: { size: { type: "sequential" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("accepts scaled constants the runtime coerces to a finite number", () => {
    // cellToNumber() coerces numeric strings and ISO date strings to a finite
    // number and the scale trains/renders, so validation must accept them —
    // only genuinely non-coercible constants (e.g. "large") are rejected.
    for (const value of ["5", "2024-01-01"]) {
      expect(
        validate(
          {
            ...base,
            aes: { ...base.aes, size: { value, scale: true } },
            scales: { size: { type: "sequential" } },
            layers: [{ geom: "point" }],
          },
          {},
        ).ok,
      ).toBe(true);
    }
  });
});
