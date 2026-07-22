import { describe, expect, test } from "bun:test";

import * as codec from "../apps/docs/src/lib/playground-codec";
import type {
  DecodePlaygroundHashResult,
  PlaygroundCodecErrorCode,
  PlaygroundCompatibility,
  PlaygroundSeedV1,
} from "../apps/docs/src/lib/playground-codec";
// Generation and docs imports use the .js specifier; keep that path type-checkable.
import type { PlaygroundSeedV1 as PlaygroundSeedV1FromJs } from "../apps/docs/src/lib/playground-codec.js";

const REQUIRED_RUNTIME_EXPORTS = [
  "PLAYGROUND_MAX_ENCODED_LENGTH",
  "PLAYGROUND_MAX_DECODED_BYTES",
  "PLAYGROUND_MAX_DEPTH",
  "PLAYGROUND_MAX_ROWS",
  "PLAYGROUND_MAX_FIELDS",
  "PLAYGROUND_MAX_STRING_CODE_POINTS",
  "PlaygroundCodecError",
  "assertPlaygroundDraftSize",
  "validatePlaygroundSeed",
  "encodePlaygroundSeed",
  "decodePlaygroundHash",
] as const;

describe("playground-codec public surface", () => {
  test("exposes the stable runtime export set from the facade module", () => {
    for (const name of REQUIRED_RUNTIME_EXPORTS) {
      expect(name in codec, `missing runtime export: ${name}`).toBe(true);
    }
    expect(typeof codec.PlaygroundCodecError).toBe("function");
    expect(typeof codec.assertPlaygroundDraftSize).toBe("function");
    expect(typeof codec.validatePlaygroundSeed).toBe("function");
    expect(typeof codec.encodePlaygroundSeed).toBe("function");
    expect(typeof codec.decodePlaygroundHash).toBe("function");
    expect(typeof codec.PLAYGROUND_MAX_ROWS).toBe("number");
  });

  test("does not leak internal leaf helpers on the facade", () => {
    const leaked = [
      "fail",
      "assertSeed",
      "assertPlaygroundSeed",
      "assertBoundedTree",
      "assertInlineDataBounds",
      "bytesToBase64Url",
      "base64UrlToBytes",
      "assertJsonByteLength",
    ];
    for (const name of leaked) {
      expect(name in codec, `internal helper leaked: ${name}`).toBe(false);
    }
  });

  test("type imports from facade and .js specifier remain usable", () => {
    const seed: PlaygroundSeedV1 = {
      version: 1,
      source: { kind: "custom" },
      spec: {
        edition: 1,
        data: { values: [{ x: 1, y: 2 }] },
        layers: [
          {
            geom: "point",
            stat: "identity",
            position: "identity",
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
    };
    const fromJs: PlaygroundSeedV1FromJs = seed;
    const code: PlaygroundCodecErrorCode = "INVALID_JSON";
    const compatibility: PlaygroundCompatibility = { supported: false, reason: "test" };
    const decoded: DecodePlaygroundHashResult = { status: "absent" };
    expect(fromJs.version).toBe(1);
    expect(code).toBe("INVALID_JSON");
    expect(compatibility.supported).toBe(false);
    expect(decoded.status).toBe("absent");
  });
});
