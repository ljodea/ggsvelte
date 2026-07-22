import type { PortableSpec, SpecError } from "@ggsvelte/spec";

export const PLAYGROUND_MAX_ENCODED_LENGTH = 16 * 1024;
export const PLAYGROUND_MAX_DECODED_BYTES = 12 * 1024;
export const PLAYGROUND_MAX_DEPTH = 8;
export const PLAYGROUND_MAX_ROWS = 500;
export const PLAYGROUND_MAX_FIELDS = 64;
export const PLAYGROUND_MAX_STRING_CODE_POINTS = 2_048;

export interface PlaygroundSeedV1 {
  readonly version: 1;
  readonly source:
    | { readonly kind: "example"; readonly id: string }
    | { readonly kind: "sample"; readonly id: string }
    | { readonly kind: "custom" };
  readonly spec: PortableSpec;
}

export type PlaygroundCompatibility =
  | {
      readonly supported: true;
      readonly seed: PlaygroundSeedV1;
      readonly fragment: string;
    }
  | { readonly supported: false; readonly reason: string };

export type PlaygroundCodecErrorCode =
  | "UNKNOWN_VERSION"
  | "ENCODED_TOO_LARGE"
  | "INVALID_BASE64URL"
  | "DECODED_TOO_LARGE"
  | "INVALID_UTF8"
  | "INVALID_JSON"
  | "INVALID_SEED"
  | "VERSION_MISMATCH"
  | "INVALID_SOURCE"
  | "NESTING_TOO_DEEP"
  | "STRING_TOO_LONG"
  | "TOO_MANY_ROWS"
  | "TOO_MANY_FIELDS"
  | "RAGGED_COLUMNS"
  | "UNSAFE_FIELD"
  | "INVALID_SPEC";

export class PlaygroundCodecError extends Error {
  readonly code: PlaygroundCodecErrorCode;
  readonly diagnostics: readonly SpecError[];

  constructor(
    code: PlaygroundCodecErrorCode,
    message: string,
    diagnostics: readonly SpecError[] = [],
  ) {
    super(message);
    this.name = "PlaygroundCodecError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export type DecodePlaygroundHashResult =
  | { readonly status: "absent" }
  | { readonly status: "ok"; readonly seed: PlaygroundSeedV1 }
  | { readonly status: "error"; readonly error: PlaygroundCodecError };

/** Shared throw helper for sibling codec modules (not re-exported from the facade). */
export function fail(
  code: PlaygroundCodecErrorCode,
  message: string,
  diagnostics: readonly SpecError[] = [],
): never {
  throw new PlaygroundCodecError(code, message, diagnostics);
}
