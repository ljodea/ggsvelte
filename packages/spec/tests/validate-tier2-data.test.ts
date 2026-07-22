/**
 * Tier-2 data-aware checks: inline data, DataProfile, input limits, temporal
 * decision reuse. Production: validate-data*.ts.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { aes, gg } from "../src/builder.ts";
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

describe("tier 2 — temporal decision reuse (characterization)", () => {
  it("accepts multi-layer charts that share one temporal field under auto time scales", () => {
    const when = ["2024-01-01", "2024-01-02", "2024-01-03"];
    const value = [1, 2, 3];
    const result = validate(
      {
        data: { columns: { when, value } },
        aes: { x: { field: "when" }, y: { field: "value" } },
        scales: { x: { type: "time" } },
        layers: [{ geom: "point" }, { geom: "line" }, { geom: "smooth" }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("reports the same ambiguous auto-inference detail once per consumer path", () => {
    const errors = errorsOf({
      data: {
        columns: {
          when: ["01/02/2023", "03/04/2023"],
          value: [1, 2],
        },
      },
      aes: { x: { field: "when" }, y: { field: "value" } },
      scales: { x: { type: "time" } },
      layers: [{ geom: "point" }, { geom: "line" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch", "scale-type-mismatch"]);
    expect(errors.every((e) => e.message.includes("ambiguous between: mdy, dmy"))).toBe(true);
    expect(errors.map((e) => e.path)).toEqual(["/layers/0/aes/x", "/layers/1/aes/x"]);
  });

  it("preserves explicit-parse rejection details across ymin and ymax on the same scale", () => {
    const errors = errorsOf({
      data: {
        columns: {
          group: ["a", "b"],
          lo: ["31/12/2024", "01/01/2025"],
          hi: ["not-a-date", "02/01/2025"],
        },
      },
      layers: [
        {
          geom: "errorbar",
          aes: { x: { field: "group" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
        },
      ],
      scales: { y: { type: "time", parse: "dmy" } },
    });
    const ymax = errors.filter((e) => e.path.endsWith("/ymax"));
    expect(ymax).toHaveLength(1);
    expect(ymax[0]?.message).toContain("rejected 1 value");
    expect(ymax[0]?.message).toContain("not-a-date");
  });

  it("accepts builder Date cells under auto time scales after multi-layer canonicalize", () => {
    // PortableSpec forbids raw Date cells; the builder ISO-coerces them, then
    // multi-layer temporal consumers must share one decision for the field.
    const when0 = new Date("2024-01-01T00:00:00.000Z");
    const when1 = new Date("2024-01-02T00:00:00.000Z");
    const spec = gg(
      [
        { when: when0, value: 1 },
        { when: when1, value: 2 },
      ],
      aes({ x: "when", y: "value" }),
    )
      .geomPoint()
      .geomLine()
      .scaleXDatetime()
      .spec();
    expect(validate(spec, {}).ok).toBe(true);
  });

  it("validates the same field for both position and sequential color consumers", () => {
    const when = ["2024-01-01", "2024-01-02", "2024-01-03"];
    const result = validate(
      {
        data: { columns: { when, value: [1, 2, 3] } },
        aes: { x: { field: "when" }, y: { field: "value" }, color: { field: "when" } },
        scales: {
          x: { type: "time" },
          color: { type: "sequential", parse: "iso", temporalKind: "date" },
        },
        layers: [{ geom: "point" }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("profile-backed temporal fields with timezone options do not invent inline evidence", () => {
    // Profile fields have temporal: null / values: null. A non-default timezone
    // must still accept profile-typed temporal fields (no accidental reuse of
    // missing evidence decisions that would flip acceptance).
    const profile: DataProfile = {
      fields: [
        { name: "when", type: "temporal" },
        { name: "value", type: "quantitative" },
      ],
    };
    const result = validate(
      {
        aes: { x: { field: "when" }, y: { field: "value" } },
        scales: { x: { type: "time", timezone: "America/New_York" } },
        layers: [{ geom: "point" }, { geom: "line" }],
      },
      { profile },
    );
    expect(result.ok).toBe(true);
  });

  it("still rejects profile nominal fields under time scales with disambiguation set", () => {
    const profile: DataProfile = {
      fields: [
        { name: "city", type: "nominal" },
        { name: "value", type: "quantitative" },
      ],
    };
    const errors = errorsOf(
      {
        aes: { x: { field: "city" }, y: { field: "value" } },
        scales: { x: { type: "time", disambiguation: "earlier" } },
        layers: [{ geom: "point" }, { geom: "line" }],
      },
      { profile },
    );
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch", "scale-type-mismatch"]);
    expect(errors.every((e) => e.message.includes('field "city" is nominal'))).toBe(true);
  });
});
