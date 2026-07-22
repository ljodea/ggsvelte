import { normalize, validate, type PortableSpec, type SpecError } from "@ggsvelte/spec";

import {
  assertPlaygroundDraftSize,
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_DEPTH,
  PLAYGROUND_MAX_ROWS,
  PlaygroundCodecError,
  validatePlaygroundSeed,
  type PlaygroundSeedV1,
} from "./playground-codec";
import type { PlaygroundDiagnostic } from "./playground-state-types";

const VALIDATE_LIMITS = {
  maxRows: PLAYGROUND_MAX_ROWS,
  maxBytes: PLAYGROUND_MAX_DECODED_BYTES,
  maxDepth: PLAYGROUND_MAX_DEPTH,
  maxDiagnostics: 100,
} as const;

export type PlaygroundDraftValidation =
  | {
      readonly ok: true;
      readonly spec: PortableSpec;
      readonly canonicalDraft: string;
      /** Raw custom seed passed to validatePlaygroundSeed for side-effect checks only. */
      readonly seed: PlaygroundSeedV1;
    }
  | { readonly ok: false; readonly diagnostics: readonly PlaygroundDiagnostic[] };

export function serializePlaygroundSpec(spec: PortableSpec): string {
  const pretty = JSON.stringify(spec, null, 2);
  if (new TextEncoder().encode(pretty).byteLength <= PLAYGROUND_MAX_DECODED_BYTES) {
    return pretty;
  }
  return JSON.stringify(spec);
}

function diagnosticFromSpec(error: SpecError): PlaygroundDiagnostic {
  return {
    source: "validation",
    code: error.code,
    path: error.path,
    message: error.message,
    ...(error.fix?.description === undefined ? {} : { fix: error.fix.description }),
  };
}

/**
 * Parse and validate a playground draft string without touching workbench state.
 * Preserve order: size → JSON → shape validate → normalize → limits validate → seed bounds.
 *
 * `validatePlaygroundSeed` is used for its throw side-effect only; the returned seed is the
 * raw custom envelope (not the codec's bounded return value), matching prior stagePlaygroundDraft.
 */
export function validatePlaygroundDraft(draft: string): PlaygroundDraftValidation {
  let input: unknown;
  try {
    assertPlaygroundDraftSize(draft);
    input = JSON.parse(draft) as unknown;
  } catch (error) {
    if (error instanceof PlaygroundCodecError) {
      return {
        ok: false,
        diagnostics: [
          {
            source: "playground",
            code: "share-limit",
            path: "",
            message: error.message,
            fix: "Use a smaller portable spec.",
          },
        ],
      };
    }
    return {
      ok: false,
      diagnostics: [
        {
          source: "playground",
          code: "invalid-json",
          path: "",
          message: error instanceof Error ? error.message : "The draft is not valid JSON.",
          fix: "Check quotes, commas, and brackets, then apply again.",
        },
      ],
    };
  }

  const shape = validate(input);
  if (!shape.ok) return { ok: false, diagnostics: shape.errors.map(diagnosticFromSpec) };
  const normalized = normalize(shape.spec);
  const checked = validate(normalized, { limits: VALIDATE_LIMITS });
  if (!checked.ok) return { ok: false, diagnostics: checked.errors.map(diagnosticFromSpec) };

  const canonicalDraft = serializePlaygroundSpec(checked.spec);
  const seed: PlaygroundSeedV1 = {
    version: 1,
    source: { kind: "custom" },
    spec: checked.spec,
  };
  try {
    // Side-effect only — do not replace seed with the bounded return value.
    validatePlaygroundSeed(seed);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          source: "playground",
          code: "share-limit",
          path: "",
          message: error instanceof Error ? error.message : "The draft exceeds playground limits.",
          fix: "Use a smaller portable spec.",
        },
      ],
    };
  }
  return { ok: true, spec: checked.spec, canonicalDraft, seed };
}
