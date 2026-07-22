import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  assertPlaygroundDraftSize,
  decodePlaygroundHash,
  encodePlaygroundSeed,
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_ENCODED_LENGTH,
  PLAYGROUND_MAX_FIELDS,
  PLAYGROUND_MAX_ROWS,
  PLAYGROUND_MAX_STRING_CODE_POINTS,
  PlaygroundCodecError,
  validatePlaygroundSeed,
  type PlaygroundSeedV1,
} from "../apps/docs/src/lib/playground-codec";

const spec: PortableSpec = {
  edition: 1,
  data: { values: [{ city: "Bogotá", value: 12 }] },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "city" }, y: { field: "value" } },
    },
  ],
};

const seed = (nextSpec: PortableSpec = spec): PlaygroundSeedV1 => ({
  version: 1,
  source: { kind: "sample", id: "starter" },
  spec: nextSpec,
});

function expectCode(hash: string, code: string): void {
  const result = decodePlaygroundHash(hash);
  expect(result.status).toBe("error");
  if (result.status === "error") expect(result.error.code).toBe(code);
}

function rawHash(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = String.fromCodePoint(...bytes);
  return `#play=v1.${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")}`;
}

describe("playground fragment codec", () => {
  test("round-trips one UTF-8 versioned seed without owning unrelated hashes", () => {
    const hash = encodePlaygroundSeed(seed());
    expect(hash).toMatch(/^#play=v1\.[A-Za-z0-9_-]+$/u);
    expect(decodePlaygroundHash(hash)).toEqual({ status: "ok", seed: seed() });
    expect(decodePlaygroundHash("#data-and-mappings")).toEqual({ status: "absent" });
    expect(decodePlaygroundHash("")).toEqual({ status: "absent" });
  });

  test("rejects malformed, padded, noncanonical, and invalid UTF-8 payloads", () => {
    expectCode("#play=v2.eyJ2ZXJzaW9uIjoxfQ", "UNKNOWN_VERSION");
    expectCode("#play=v1.a", "INVALID_BASE64URL");
    expectCode("#play=v1.YQ==", "INVALID_BASE64URL");
    expectCode("#play=v1.YR", "INVALID_BASE64URL"); // non-zero trailing bits
    expectCode("#play=v1._w", "INVALID_UTF8");
  });

  test("checks editor, encoded, and decoded limits before parsing", () => {
    expect(() => {
      assertPlaygroundDraftSize("x".repeat(PLAYGROUND_MAX_DECODED_BYTES + 1));
    }).toThrow(
      new PlaygroundCodecError(
        "DECODED_TOO_LARGE",
        `Playground JSON must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
      ),
    );
    expect(() => {
      assertPlaygroundDraftSize("🧭".repeat(PLAYGROUND_MAX_DECODED_BYTES / 2));
    }).toThrow(PlaygroundCodecError);
    expectCode(`#play=v1.${"a".repeat(PLAYGROUND_MAX_ENCODED_LENGTH + 1)}`, "ENCODED_TOO_LARGE");
    const decodedLarge = seed({
      ...spec,
      data: {
        values: Array.from({ length: 500 }, (_, value) => ({
          city: `city-${String(value)}`,
          value,
          label: `row-${String(value)}-${"x".repeat(20)}`,
        })),
      },
    });
    expect(() => encodePlaygroundSeed(decodedLarge)).toThrow(
      new PlaygroundCodecError(
        "DECODED_TOO_LARGE",
        `Shared playground JSON must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
      ),
    );
  });

  test("rejects invalid envelopes, source discriminants, and version mismatches", () => {
    expectCode(rawHash({ version: 1, source: { kind: "sample", id: "starter" } }), "INVALID_SEED");
    expectCode(rawHash({ ...seed(), version: 2 }), "VERSION_MISMATCH");
    expectCode(rawHash({ ...seed(), source: { kind: "remote", id: "x" } }), "INVALID_SOURCE");
    expectCode(rawHash({ ...seed(), source: { kind: "custom", id: "x" } }), "INVALID_SOURCE");
  });

  test("enforces root-defined depth and Unicode code-point lengths", () => {
    const deep = structuredClone(seed()) as unknown as Record<string, unknown>;
    deep["extra"] = { a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } };
    expectCode(rawHash(deep), "NESTING_TOO_DEEP");

    const astral = "🧭".repeat(2_049);
    expectCode(rawHash(seed({ ...spec, labs: { title: astral } })), "STRING_TOO_LONG");
    expectCode(
      rawHash(
        seed({
          ...spec,
          data: { values: [{ [astral]: 1, value: 2 }] },
        }),
      ),
      "STRING_TOO_LONG",
    );
  });

  test("bounds row, column, and named inline datasets as one aggregate", () => {
    const rows = Array.from({ length: 501 }, (_, value) => ({ value }));
    expectCode(rawHash(seed({ ...spec, data: { values: rows } })), "TOO_MANY_ROWS");

    const columns = Object.fromEntries(
      Array.from({ length: 65 }, (_, index) => [`field${String(index)}`, [index]]),
    );
    expectCode(rawHash(seed({ ...spec, data: { columns } })), "TOO_MANY_FIELDS");

    expectCode(
      rawHash(
        seed({
          ...spec,
          data: { columns: { x: [1, 2], y: [1] } },
        }),
      ),
      "RAGGED_COLUMNS",
    );

    expectCode(
      rawHash(
        seed({
          ...spec,
          data: { name: "used" },
          datasets: {
            used: { values: Array.from({ length: 300 }, (_, value) => ({ value })) },
            unused: { columns: { value: Array.from({ length: 201 }, (_, value) => value) } },
          },
        }),
      ),
      "TOO_MANY_ROWS",
    );
  });

  test("rejects unsafe row, column, and dataset names", () => {
    const unsafeRow: Record<string, string | number | boolean | null> = { value: 2 };
    Object.defineProperty(unsafeRow, "__proto__", { value: 1, enumerable: true });
    expectCode(rawHash(seed({ ...spec, data: { values: [unsafeRow] } })), "UNSAFE_FIELD");

    const unsafeColumns: Record<string, readonly (string | number | boolean | null)[]> = {
      value: [2],
    };
    Object.defineProperty(unsafeColumns, "constructor", { value: [1], enumerable: true });
    expectCode(rawHash(seed({ ...spec, data: { columns: unsafeColumns } })), "UNSAFE_FIELD");

    const datasets = Object.create(null) as Record<string, PortableSpec["data"]>;
    datasets["__proto__"] = { values: [{ value: 2 }] };
    expectCode(rawHash(seed({ ...spec, data: { name: "__proto__" }, datasets })), "UNSAFE_FIELD");
  });

  test("rejects unsafe named references even without an inline dataset key", () => {
    expectCode(rawHash(seed({ ...spec, data: { name: "constructor" } })), "UNSAFE_FIELD");
    expectCode(
      rawHash(
        seed({
          ...spec,
          layers: [{ ...spec.layers[0]!, data: { name: "prototype" } }],
        }),
      ),
      "UNSAFE_FIELD",
    );
  });

  test("surfaces tier-2 PortableSpec diagnostics", () => {
    const invalid = {
      ...spec,
      layers: [{ geom: "point", stat: "identity", position: "identity" }],
    } as PortableSpec;
    const result = decodePlaygroundHash(rawHash(seed(invalid)));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error).toBeInstanceOf(PlaygroundCodecError);
      expect(result.error.code).toBe("INVALID_SPEC");
      expect(result.error.diagnostics[0]?.code).toBe("missing-required-channel");
    }
  });

  test("rejects invalid JSON payloads after base64 decode", () => {
    const binary = "{not-json";
    const payload = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
    expectCode(`#play=v1.${payload}`, "INVALID_JSON");
  });

  test("rejects unknown envelope fields on decode and validate", () => {
    const withExtra = { ...seed(), unexpected: true };
    expectCode(rawHash(withExtra), "INVALID_SEED");
    expect(() => validatePlaygroundSeed(withExtra as PlaygroundSeedV1)).toThrow(
      new PlaygroundCodecError(
        "INVALID_SEED",
        "Shared playground state contains unknown envelope fields.",
      ),
    );
  });

  test("accepts seeds at exact share limits and fails one over", () => {
    // Column form stays under the JSON byte ceiling at the row limit.
    const atRowsSeed: PlaygroundSeedV1 = {
      version: 1,
      source: { kind: "sample", id: "starter" },
      spec: {
        edition: 1,
        data: {
          columns: {
            city: Array.from({ length: PLAYGROUND_MAX_ROWS }, () => "a"),
            value: Array.from({ length: PLAYGROUND_MAX_ROWS }, (_, value) => value),
          },
        },
        layers: spec.layers,
      },
    };
    expect(validatePlaygroundSeed(atRowsSeed).spec.data).toEqual(atRowsSeed.spec.data);
    expect(() =>
      validatePlaygroundSeed({
        ...atRowsSeed,
        spec: {
          ...atRowsSeed.spec,
          data: {
            columns: {
              city: Array.from({ length: PLAYGROUND_MAX_ROWS + 1 }, () => "a"),
              value: Array.from({ length: PLAYGROUND_MAX_ROWS + 1 }, (_, value) => value),
            },
          },
        },
      }),
    ).toThrow(
      new PlaygroundCodecError(
        "TOO_MANY_ROWS",
        `Shared playground state may contain at most ${String(PLAYGROUND_MAX_ROWS)} inline rows in total.`,
      ),
    );

    const fieldNames = Array.from(
      { length: PLAYGROUND_MAX_FIELDS },
      (_, index) => `f${String(index)}`,
    );
    const atFieldsSeed: PlaygroundSeedV1 = {
      version: 1,
      source: { kind: "custom" },
      spec: {
        edition: 1,
        data: {
          columns: Object.fromEntries(fieldNames.map((name, index) => [name, [index]])),
        },
        layers: [
          {
            geom: "point",
            stat: "identity",
            position: "identity",
            aes: { x: { field: "f0" }, y: { field: "f1" } },
          },
        ],
      },
    };
    expect(validatePlaygroundSeed(atFieldsSeed).spec.data).toEqual(atFieldsSeed.spec.data);

    const titleAtLimit = "a".repeat(PLAYGROUND_MAX_STRING_CODE_POINTS);
    expect(
      validatePlaygroundSeed(seed({ ...spec, labs: { title: titleAtLimit } })).spec.labs?.title,
    ).toBe(titleAtLimit);
  });

  test("validatePlaygroundSeed prefers structural reasons over share-size ceilings", () => {
    // Oversized string is reported before any whole-envelope DECoded/ENCODED ceiling.
    const oversizedTitle = "🧭".repeat(PLAYGROUND_MAX_STRING_CODE_POINTS + 1);
    expect(() =>
      validatePlaygroundSeed(seed({ ...spec, labs: { title: oversizedTitle } })),
    ).toThrow(
      new PlaygroundCodecError(
        "STRING_TOO_LONG",
        `Shared playground strings must contain at most ${String(PLAYGROUND_MAX_STRING_CODE_POINTS)} Unicode code points.`,
      ),
    );

    const tooManyRows = seed({
      ...spec,
      data: {
        values: Array.from({ length: PLAYGROUND_MAX_ROWS + 1 }, (_, value) => ({ value })),
      },
    });
    try {
      validatePlaygroundSeed(tooManyRows);
      throw new Error("expected validatePlaygroundSeed to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PlaygroundCodecError);
      if (error instanceof PlaygroundCodecError) {
        expect(error.code).toBe("TOO_MANY_ROWS");
      }
    }
  });

  test("validatePlaygroundSeed returns a bounded seed and preserves instanceof errors", () => {
    const bounded = validatePlaygroundSeed(seed());
    expect(bounded).toEqual(seed());
    expect(bounded).not.toBe(seed());
    try {
      validatePlaygroundSeed(seed({ ...spec, data: { values: [{ value: 1 }] } }));
      throw new Error("expected invalid spec");
    } catch (error) {
      expect(error).toBeInstanceOf(PlaygroundCodecError);
      if (error instanceof PlaygroundCodecError) {
        expect(error.name).toBe("PlaygroundCodecError");
        expect(error.code).toBe("INVALID_SPEC");
      }
    }
  });
});
