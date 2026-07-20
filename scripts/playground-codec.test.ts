import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  assertPlaygroundDraftSize,
  decodePlaygroundHash,
  encodePlaygroundSeed,
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_ENCODED_LENGTH,
  PlaygroundCodecError,
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
});
