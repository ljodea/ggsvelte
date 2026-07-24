import { PLAYGROUND_PROMPT_MAX_CHARS } from "../../../apps/docs/src/lib/playground-dataset-schemas";

export type PlaygroundApiErrorCode =
  | "bad_request"
  | "prompt_too_long"
  | "unknown_dataset"
  | "origin_forbidden"
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
  readonly model: string;
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

export function statusForError(code: PlaygroundApiErrorCode): number {
  switch (code) {
    case "bad_request":
    case "prompt_too_long":
    case "unknown_dataset":
      return 400;
    case "bad_output":
      // Upstream returned unusable output — server-class, not a client error.
      return 502;
    case "origin_forbidden":
      return 403;
    case "rate_limited":
    case "upstream_rate_limited":
      return 429;
    case "disabled":
      return 503;
    case "upstream_error":
      return 502;
  }
}

/** User-facing messages — never echo upstream bodies. */
export const SAFE_MESSAGES = {
  bad_request: "The request is invalid.",
  prompt_too_long: `Prompt is too long (max ${PLAYGROUND_PROMPT_MAX_CHARS} characters).`,
  unknown_dataset: "Unknown dataset.",
  origin_forbidden: "Origin is not allowed.",
  rate_limited: "Too many requests. Try again shortly.",
  upstream_rate_limited: "The model provider is rate-limiting. Try again shortly.",
  upstream_error: "The model provider failed. Try again or use a sample chart.",
  bad_output: "The model returned an unusable response.",
  disabled: "Live generation is paused — the copy-to-your-agent path always works.",
  oversized_input: "Request body is too large.",
} as const;
