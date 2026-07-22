/**
 * Public playground fragment codec surface.
 *
 * Implementation is split across:
 * - playground-codec-contract.ts — limits, types, PlaygroundCodecError, fail()
 * - playground-seed-validation.ts — envelope, structural bounds, PortableSpec checks
 * - playground-codec.ts — base64url wire format, encode/decode, share-size orchestration
 */

import {
  fail,
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_ENCODED_LENGTH,
  PlaygroundCodecError,
  type DecodePlaygroundHashResult,
  type PlaygroundSeedV1,
} from "./playground-codec-contract";
import {
  assertPlaygroundJsonBytes,
  assertPlaygroundSeed,
  validatePlaygroundSeedContents,
} from "./playground-seed-validation";

export {
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_DEPTH,
  PLAYGROUND_MAX_ENCODED_LENGTH,
  PLAYGROUND_MAX_FIELDS,
  PLAYGROUND_MAX_ROWS,
  PLAYGROUND_MAX_STRING_CODE_POINTS,
  PlaygroundCodecError,
  type DecodePlaygroundHashResult,
  type PlaygroundCodecErrorCode,
  type PlaygroundCompatibility,
  type PlaygroundSeedV1,
} from "./playground-codec-contract";

export { assertPlaygroundDraftSize } from "./playground-seed-validation";

const HASH_PREFIX = "#play=";
const PAYLOAD_PREFIX = "v1.";

function bytesToBase64Url(bytes: Uint8Array): string {
  const encoded = btoa(String.fromCodePoint(...bytes));
  return encoded.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(payload: string): Uint8Array {
  if (payload.length === 0 || payload.length % 4 === 1 || !/^[A-Za-z0-9_-]+$/u.test(payload)) {
    fail("INVALID_BASE64URL", "The shared playground payload is not canonical base64url.");
  }
  const standard = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    fail("INVALID_BASE64URL", "The shared playground payload is not valid base64url.");
  }
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
  if (bytesToBase64Url(bytes) !== payload) {
    fail("INVALID_BASE64URL", "The shared playground payload uses noncanonical trailing bits.");
  }
  return bytes;
}

export function validatePlaygroundSeed(seed: PlaygroundSeedV1): PlaygroundSeedV1 {
  // Structural reasons first (via validatePlaygroundSeedContents), then the
  // whole-envelope encoded share-size ceiling owned by the wire format.
  const bounded = validatePlaygroundSeedContents(seed);
  const payload = bytesToBase64Url(
    assertPlaygroundJsonBytes(JSON.stringify(bounded), "Shared playground JSON"),
  );
  if (payload.length > PLAYGROUND_MAX_ENCODED_LENGTH) {
    fail(
      "ENCODED_TOO_LARGE",
      `Shared playground payloads must be at most ${String(PLAYGROUND_MAX_ENCODED_LENGTH / 1024)} KiB.`,
    );
  }
  return bounded;
}

export function encodePlaygroundSeed(seed: PlaygroundSeedV1): string {
  const bounded = validatePlaygroundSeed(seed);
  const bytes = new TextEncoder().encode(JSON.stringify(bounded));
  return `${HASH_PREFIX}${PAYLOAD_PREFIX}${bytesToBase64Url(bytes)}`;
}

export function decodePlaygroundHash(hash: string): DecodePlaygroundHashResult {
  if (!hash.startsWith(HASH_PREFIX)) return { status: "absent" };
  try {
    const payloadWithVersion = hash.slice(HASH_PREFIX.length);
    const separator = payloadWithVersion.indexOf(".");
    if (separator === -1 || payloadWithVersion.slice(0, separator) !== "v1") {
      fail("UNKNOWN_VERSION", "This shared playground version is not supported.");
    }
    const payload = payloadWithVersion.slice(separator + 1);
    if (payload.length > PLAYGROUND_MAX_ENCODED_LENGTH) {
      fail(
        "ENCODED_TOO_LARGE",
        `Shared playground payloads must be at most ${String(PLAYGROUND_MAX_ENCODED_LENGTH / 1024)} KiB.`,
      );
    }
    const bytes = base64UrlToBytes(payload);
    if (bytes.byteLength > PLAYGROUND_MAX_DECODED_BYTES) {
      fail(
        "DECODED_TOO_LARGE",
        `Shared playground JSON must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
      );
    }
    let json: string;
    try {
      json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail("INVALID_UTF8", "The shared playground payload is not valid UTF-8.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json) as unknown;
    } catch {
      fail("INVALID_JSON", "The shared playground payload is not valid JSON.");
    }
    return { status: "ok", seed: assertPlaygroundSeed(parsed) };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof PlaygroundCodecError
          ? error
          : new PlaygroundCodecError("INVALID_SEED", "The shared playground state is invalid."),
    };
  }
}
