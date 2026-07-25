import { PLAYGROUND_PROMPT_MAX_CHARS } from "../../../apps/docs/src/lib/playground-dataset-schemas";

export type PlaygroundApiErrorCode =
  | "bad_request"
  | "prompt_too_long"
  | "unknown_dataset"
  | "origin_forbidden"
  | "not_found"
  | "method_not_allowed"
  | "rate_limited"
  | "upstream_rate_limited"
  | "upstream_error"
  | "bad_output"
  | "disabled";

export interface PlaygroundApiErrorBody {
  readonly code: PlaygroundApiErrorCode;
  readonly message: string;
  readonly retryAfterSeconds?: number;
}

export interface PlaygroundApiErrorResponse {
  readonly ok: false;
  readonly error: PlaygroundApiErrorBody;
}

export interface PlaygroundApiSuccessResponse {
  readonly ok: true;
  /** null when the completion did not name the model that answered (#697). */
  readonly model: string | null;
  readonly envelope: unknown;
}

export type PlaygroundApiResponse = PlaygroundApiSuccessResponse | PlaygroundApiErrorResponse;

export function apiError(
  code: PlaygroundApiErrorCode,
  message: string,
  retryAfterSeconds?: number,
): PlaygroundApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
  };
}

// Keyed by the full union, so adding an error code is a compile error until it
// gets a status — the same exhaustiveness a switch gave, with a single return.
const ERROR_STATUS: Record<PlaygroundApiErrorCode, number> = {
  bad_request: 400,
  prompt_too_long: 400,
  unknown_dataset: 400,
  origin_forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  rate_limited: 429,
  upstream_rate_limited: 429,
  disabled: 503,
  upstream_error: 502,
  // Upstream returned unusable output — server-class, not a client error.
  bad_output: 502,
};

export function statusForError(code: PlaygroundApiErrorCode): number {
  return ERROR_STATUS[code];
}

/** User-facing messages — never echo upstream bodies. */
export const SAFE_MESSAGES = {
  bad_request: "The request is invalid.",
  prompt_too_long: `Prompt is too long (max ${PLAYGROUND_PROMPT_MAX_CHARS} characters).`,
  unknown_dataset: "Unknown dataset.",
  origin_forbidden: "Origin is not allowed.",
  not_found: "No such endpoint.",
  method_not_allowed: "Method not allowed.",
  rate_limited: "Too many requests. Try again shortly.",
  upstream_rate_limited: "The model provider is rate-limiting. Try again shortly.",
  upstream_error: "The model provider failed. Try again or use a sample chart.",
  bad_output: "The model returned an unusable response.",
  disabled: "Live generation is paused — the copy-to-your-agent path always works.",
  oversized_input: "Request body is too large.",
} as const;
