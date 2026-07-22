/**
 * Tier-2 data-aware checks: inline data, DataProfile, input limits.
 * Temporal decision reuse: validate-tier2-temporal-reuse.test.ts (reuse) + validate-tier2-temporal-position.test.ts (scales).
 * Production: validate-data*.ts.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import type { DataProfile } from "../src/validate-data.ts";
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
    // at runtime, so validation must not accept them as a recovery bound.
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
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
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
});

describe("tier 2 — DataProfile", () => {
  const profile: DataProfile = {
    fields: [
      { name: "city", type: "nominal" },
      { name: "temp", type: "quantitative" },
      { name: "when", type: "temporal" },
    ],
    rowCount: 120,
  };

  it("validates field existence and scale compatibility without data", () => {
    const spec = {
      aes: { x: { field: "cityy" }, y: { field: "temp" } },
      scales: { y: { type: "time" } },
      layers: [{ geom: "point" }],
    };
    const errors = errorsOf(spec, { profile });
    expect(errors.map((e) => e.code)).toEqual(["unknown-field", "scale-type-mismatch"]);
    expect(errors[0]?.message).toContain('Did you mean "city"?');
  });

  it("rejects malformed profiles", () => {
    expect(
      codesOf(
        { layers: [{ geom: "point", aes: { x: { field: "a" }, y: { field: "b" } } }] },
        { profile: fromAny({ fields: [{ name: "a", type: "numeric" }] }) },
      ),
    ).toEqual(["invalid-data-profile"]);
  });

  it("defers a profile-backed temporal numeric style with a working parser", () => {
    // Profile fields carry no sample values, so the temporal decision is null; with an
    // epoch parser the runtime turns the numeric column temporal once data arrives, so
    // the numeric-style check must defer rather than false-reject a spec that renders.
    expect(
      validate(
        {
          aes: { x: { field: "city" }, y: { field: "temp" }, size: { field: "temp" } },
          scales: { size: { type: "sequential", parse: { epoch: "seconds" } } },
          layers: [{ geom: "point" }],
        },
        { profile },
      ).ok,
    ).toBe(true);
  });

  it("rejects a profile-backed temporal numeric style without an epoch parser", () => {
    // Without an epoch parser (or censor recovery), a quantitative profile field with
    // temporalKind stays non-temporal at runtime and throws style-temporal-parse, so
    // validation must reject it rather than defer just because there are no samples.
    const errors = errorsOf(
      {
        aes: { x: { field: "city" }, y: { field: "temp" }, size: { field: "temp" } },
        scales: { size: { type: "sequential", temporalKind: "date" } },
        layers: [{ geom: "point" }],
      },
      { profile },
    );
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
  });

  it("rejects a profile epoch temporal style requesting an incompatible date kind", () => {
    // Epoch parsing always yields datetime; a profile-backed field with an epoch parser
    // and temporalKind: "date" throws style-temporal-kind at runtime, so the defer must
    // not accept it just because there are no samples.
    const errors = errorsOf(
      {
        aes: { x: { field: "city" }, y: { field: "temp" }, size: { field: "temp" } },
        scales: { size: { type: "sequential", parse: { epoch: "seconds" }, temporalKind: "date" } },
        layers: [{ geom: "point" }],
      },
      { profile },
    );
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch"]);
    expect(errors[0]?.message).toContain("datetime");
  });
});

describe("tier 2 — input limits", () => {
  it("row limit skips data checks with a validation-limit diagnostic", () => {
    const n = 50;
    const spec = {
      data: { columns: { x: Array.from({ length: n }, (_, i) => i) } },
      aes: { x: { field: "x" }, y: { field: "x" } },
      layers: [{ geom: "point" }],
    };
    const errors = errorsOf(spec, { limits: { maxRows: 10 } });
    expect(errors.map((e) => e.code)).toEqual(["validation-limit"]);
    expect(errors[0]?.message).toContain("maxRows");
  });

  it("byte limit skips data checks with a validation-limit diagnostic", () => {
    // Wide strings force estimateBytes over a tiny maxBytes without many rows.
    const fat = "x".repeat(2000);
    const spec = {
      data: { columns: { x: [fat, fat], y: [1, 2] } },
      aes: { x: { field: "missing" }, y: { field: "y" } },
      layers: [{ geom: "point" }],
    };
    const errors = errorsOf(spec, { limits: { maxBytes: 100 } });
    expect(errors.map((e) => e.code)).toEqual(["validation-limit"]);
    expect(errors[0]?.message).toContain("maxBytes");
    // Evidence short-circuit: no unknown-field for "missing".
    expect(errors.some((e) => e.code === "unknown-field")).toBe(false);
  });

  it("depth limit refuses pathological nesting", () => {
    let nested: Record<string, unknown> = { field: "x" };
    for (let i = 0; i < 50; i++) nested = { wrap: nested };
    const errors = errorsOf({ layers: [{ geom: "point" }], junk: nested });
    expect(errors[0]?.code).toBe("validation-limit");
    expect(errors[0]?.message).toContain("maxDepth");
  });

  it("diagnostics are capped by maxDiagnostics", () => {
    const layers = Array.from({ length: 30 }, () => ({ geom: "point" }));
    const errors = errorsOf({ layers }, { limits: { maxDiagnostics: 5 } });
    expect(errors).toHaveLength(6);
    expect(errors.at(-1)?.code).toBe("validation-limit");
  });
});
