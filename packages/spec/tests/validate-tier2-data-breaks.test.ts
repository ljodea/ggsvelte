/**
 * Tier-2 data-aware checks: binned breaks/domain (#599), censor recovery, malformed-parser diagnostics.
 * Split from validate-tier2-data.test.ts (second inline-data block).
 * Temporal decision reuse: validate-tier2-temporal-reuse.test.ts (reuse) + validate-tier2-temporal-position.test.ts (scales).
 * Production: validate-data*.ts (style: validate-data-checks-style.ts).
 */
import { fromAny } from "@total-typescript/shoehorn";
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

describe("tier 2 — data-aware checks (inline data)", () => {
  const base = {
    data: { values: rows },
    aes: { x: { field: "city" }, y: { field: "temp" } },
  };

  it("accepts a censored binned temporal numeric style trained from authored breaks", () => {
    // A binned scale whose ISO breaks parse into the runtime domain renders even
    // when every field value fails the parser (parseFailure: "censor") — authored
    // binned breaks are a recovery bound like an explicit domain, so validation
    // must not reject a spec the runtime honors.
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "temp" } },
          scales: {
            size: {
              type: "binned",
              parse: "iso",
              parseFailure: "censor",
              breaks: ["2024-01-01", "2024-01-15", "2024-01-31"],
            },
          },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("rejects descending/duplicate binned style breaks with scale-binned-breaks (#599)", () => {
    // Runtime throws style-binned-breaks for non-strictly-increasing boundaries;
    // validation must pre-empt with a breaks-specific code (not scale-type-mismatch).
    const descending = errorsOf({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: { size: { type: "binned", breaks: [10, 5, 0], range: [2, 6] } },
      layers: [{ geom: "point" }],
    });
    expect(descending.map((e) => e.code)).toContain("scale-binned-breaks");
    expect(descending.some((e) => e.code === "scale-type-mismatch")).toBe(false);

    const duplicate = errorsOf({
      ...base,
      aes: { ...base.aes, linewidth: { field: "temp" } },
      scales: { linewidth: { type: "binned", breaks: [0, 10, 10], range: [0.5, 2] } },
      layers: [{ geom: "point" }],
    });
    expect(duplicate.map((e) => e.code)).toContain("scale-binned-breaks");

    const finite = errorsOf({
      ...base,
      aes: { ...base.aes, shape: { field: "temp" } },
      scales: { shape: { type: "binned", breaks: [2, 1, 0] } },
      layers: [{ geom: "point" }],
    });
    expect(finite.map((e) => e.code)).toContain("scale-binned-breaks");
  });

  it("rejects binned domain that disagrees with breaks with scale-binned-domain (#599)", () => {
    // Runtime style-domain-invalid when domain endpoints ≠ first/last breaks.
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: {
        size: { type: "binned", domain: [0, 50], breaks: [0, 5, 10], range: [2, 6] },
      },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toContain("scale-binned-domain");
    expect(errors[0]?.path).toBe("/scales/size/domain");
  });

  it("rejects non-monotonic temporal binned breaks regardless of parseFailure (#599)", () => {
    // Censor recovery must not treat non-monotonic ISO breaks as a valid bound;
    // the diagnostic is breaks-specific, not a generic type mismatch.
    for (const parseFailure of ["error", "censor"] as const) {
      const errors = errorsOf({
        ...base,
        aes: { ...base.aes, size: { field: "temp" } },
        scales: {
          size: {
            type: "binned",
            parse: "iso",
            parseFailure,
            breaks: ["2024-01-31", "2024-01-15", "2024-01-01"],
          },
        },
        layers: [{ geom: "point" }],
      });
      expect(errors.map((e) => e.code)).toContain("scale-binned-breaks");
    }
  });

  it("rejects temporal domain/breaks endpoint disagreement (#599)", () => {
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: {
        size: {
          type: "binned",
          parse: "iso",
          domain: ["2024-01-01", "2024-02-01"],
          breaks: ["2024-01-01", "2024-01-15", "2024-01-31"],
        },
      },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toContain("scale-binned-domain");
  });

  it("accepts matching domain and strictly increasing binned breaks (#599)", () => {
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { field: "temp" } },
          scales: {
            size: { type: "binned", domain: [0, 20], breaks: [0, 10, 20], range: [2, 6] },
          },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("returns a diagnostic (not a thrown error) for a schema-invalid numeric-style parser", () => {
    // parse: 123 is a schema error, but tier-2 still runs; the temporal check must
    // defer to the schema diagnostic instead of crashing when the malformed parser
    // reaches canonicalTemporalParserKey.
    const spec = {
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: { size: { type: "sequential", parse: 123 } },
      layers: [{ geom: "point" }],
    };
    expect(() => validate(spec, {})).not.toThrow();
    const result = validate(spec, {});
    expect(result.ok).toBe(false);
  });

  it("rejects a non-temporal scaled constant on a temporal numeric style", () => {
    // The runtime feeds scaled constants through the temporal parser too, so
    // size: { value: "large" } on a temporal scale throws style-temporal-parse;
    // the constant check must run for temporal scales, not just numeric ones.
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { value: "large", scale: true } },
      scales: { size: { type: "sequential", temporalKind: "date" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain("large");
  });

  it("accepts a parseable scaled constant on a temporal numeric style", () => {
    expect(
      validate(
        {
          ...base,
          aes: { ...base.aes, size: { value: "2024-01-01", scale: true } },
          scales: { size: { type: "sequential", parse: "iso" } },
          layers: [{ geom: "point" }],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("rejects a censored binned temporal style whose breaks do not parse", () => {
    // Authored binned breaks only rescue a censored all-invalid column if they parse
    // under the configured parser; unparseable breaks still throw style-binned-breaks
    // at runtime. Validation emits scale-binned-breaks for the malformed bounds and
    // still scale-type-mismatch because they are not a usable recovery bound.
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: {
        size: {
          type: "binned",
          parse: "iso",
          parseFailure: "censor",
          breaks: ["not-a-date", "also-bad"],
        },
      },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-binned-breaks", "scale-type-mismatch"]);
  });

  it("does not throw formatting a BigInt scaled constant in a diagnostic", () => {
    // Tier-2 runs after schema errors, so a schema-invalid BigInt constant reaches
    // the diagnostic path; JSON.stringify(1n) throws, so a safe formatter is required.
    const spec = fromAny({
      ...base,
      aes: { ...base.aes, size: { value: 1n, scale: true } },
      scales: { size: { type: "sequential" } },
      layers: [{ geom: "point" }],
    });
    expect(() => validate(spec, {})).not.toThrow();
    expect(validate(spec, {}).ok).toBe(false);
  });

  it("does not throw formatting a Symbol temporalKind in a diagnostic", () => {
    // A schema-invalid non-string temporalKind can reach the mismatch message when the
    // field parses temporal; stringifying a Symbol throws, so it must be guarded.
    const spec = fromAny({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: {
        size: { type: "sequential", parse: { epoch: "seconds" }, temporalKind: Symbol("date") },
      },
      layers: [{ geom: "point" }],
    });
    expect(() => validate(spec, {})).not.toThrow();
  });

  it("rejects a datetime scaled constant on a date temporal numeric style", () => {
    // The constant parses as datetime; the runtime throws style-temporal-kind against a
    // date scale, so validation must compare the parsed kind, not just temporal-ness.
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { value: "2024-01-01T12:00", scale: true } },
      scales: { size: { type: "sequential", parse: "iso", temporalKind: "date" } },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain("datetime");
  });

  it("rejects a censored temporal constant when no parser can parse the recovery domain", () => {
    // With no parser the non-empty constant makes the runtime infer a non-temporal auto
    // parser, so the authored temporal domain cannot parse and scale resolution throws
    // style-domain-invalid; censor recovery must require a usable, parseable parser.
    const errors = errorsOf({
      ...base,
      aes: { ...base.aes, size: { value: "large", scale: true } },
      scales: {
        size: {
          type: "sequential",
          temporalKind: "date",
          parseFailure: "censor",
          domain: ["2024-01-01", "2024-01-02"],
        },
      },
      layers: [{ geom: "point" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
  });

  it("does not throw on a non-primitive temporal scaled constant", () => {
    // A schema-invalid object constant (with a BigInt) must not reach parseTemporalColumn,
    // whose evidence formatting throws on BigInt; it is treated as non-temporal instead.
    const spec = fromAny({
      ...base,
      aes: { ...base.aes, size: { value: { n: 1n }, scale: true } },
      scales: { size: { type: "sequential", parse: "iso" } },
      layers: [{ geom: "point" }],
    });
    expect(() => validate(spec, {})).not.toThrow();
    expect(validate(spec, {}).ok).toBe(false);
  });

  it("does not throw on a schema-invalid temporal option", () => {
    // A Symbol timezone reaches tier-2; it must not be handed to the temporal helpers
    // (whose cache-key/parse assumptions throw) — defer to the schema diagnostic.
    const spec = fromAny({
      ...base,
      aes: { ...base.aes, size: { field: "temp" } },
      scales: { size: { type: "sequential", parse: { epoch: "seconds" }, timezone: Symbol("x") } },
      layers: [{ geom: "point" }],
    });
    expect(() => validate(spec, {})).not.toThrow();
  });

  it("accepts an invalid censored constant when a field trains the temporal scale", () => {
    // Layer 1 maps size to a temporal field (trains the scale); layer 2 adds a censored
    // invalid constant, which the runtime censors to the unknown style rather than failing
    // — the same partial-invalid recovery already accepted for fields.
    expect(
      validate(
        {
          data: { values: rows },
          aes: { x: { field: "city" }, y: { field: "temp" } },
          scales: { size: { type: "sequential", parse: "iso", parseFailure: "censor" } },
          layers: [
            { geom: "point", aes: { size: { field: "when" } } },
            { geom: "point", aes: { size: { value: "large", scale: true } } },
          ],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("accepts an all-invalid censored quantitative field when a sibling field trains the scale", () => {
    // Runtime collects all size-channel values together; a parseable ISO field trains
    // while a numeric column is censored — validation must not reject field-by-field.
    expect(
      validate(
        {
          data: {
            values: [
              { city: "Berlin", temp: 21.5, when: "2026-01-01", bad: 1e100 },
              { city: "Oslo", temp: -3.2, when: "2026-01-02", bad: 1e101 },
            ],
          },
          aes: { x: { field: "city" }, y: { field: "temp" } },
          scales: { size: { type: "sequential", parse: "iso", parseFailure: "censor" } },
          layers: [
            { geom: "point", aes: { size: { field: "when" } } },
            { geom: "point", aes: { size: { field: "bad" } } },
          ],
        },
        {},
      ).ok,
    ).toBe(true);
  });

  it("accepts an invalid censored constant when a sibling constant trains the scale", () => {
    // Valid scaled ISO constant trains the scale; invalid "large" is censored to unknown.
    expect(
      validate(
        {
          data: { values: rows },
          aes: { x: { field: "city" }, y: { field: "temp" } },
          scales: { size: { type: "sequential", parse: "iso", parseFailure: "censor" } },
          layers: [
            { geom: "point", aes: { size: { value: "2026-01-01", scale: true } } },
            { geom: "point", aes: { size: { value: "large", scale: true } } },
          ],
        },
        {},
      ).ok,
    ).toBe(true);
  });
});
