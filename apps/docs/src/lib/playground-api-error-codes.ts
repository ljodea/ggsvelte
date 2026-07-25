/**
 * Dependency-free wire contract for playground-api failures, shared by the
 * worker (workers/playground-api) and the docs client. Single source of truth
 * for the error-code union and for the failure copy that must read the same
 * whichever side produced it (#695).
 *
 * Same seam as playground-dataset-schemas.ts: the worker imports it straight
 * from source, so this module must stay free of app-only imports.
 */

import { PLAYGROUND_PROMPT_MAX_CHARS } from "./playground-dataset-schemas";

/**
 * Every code the worker can put on the wire. Adding one here is a compile
 * error in the worker's status map and safe-message table until it is handled,
 * and the client's recognizer widens automatically — the drift this array
 * exists to kill.
 */
export const PLAYGROUND_API_ERROR_CODES = [
  "bad_request",
  "prompt_too_long",
  "unknown_dataset",
  "origin_forbidden",
  "not_found",
  "method_not_allowed",
  "rate_limited",
  "upstream_rate_limited",
  "upstream_error",
  "bad_output",
  "disabled",
] as const;

export type PlaygroundApiErrorCode = (typeof PLAYGROUND_API_ERROR_CODES)[number];

export function isPlaygroundApiErrorCode(value: unknown): value is PlaygroundApiErrorCode {
  return (
    typeof value === "string" && (PLAYGROUND_API_ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * Failure copy that must be byte-identical on both sides: the worker sends it
 * when it answers, the client synthesises it when no worker body came back, and
 * a user must not see two wordings for one failure.
 *
 * Codes absent from this table word their sides differently on purpose — the
 * worker reports the transport fact ("No such endpoint."), the client tells the
 * user what to do instead ("Use a sample chart or copy the agent prompt.").
 */
export const SHARED_API_ERROR_MESSAGES = {
  prompt_too_long: `Prompt is too long (max ${PLAYGROUND_PROMPT_MAX_CHARS} characters).`,
  unknown_dataset: "Unknown dataset.",
  rate_limited: "Too many requests. Try again shortly.",
  upstream_error: "The model provider failed. Try again or use a sample chart.",
  disabled: "Live generation is paused — the copy-to-your-agent path always works.",
} as const satisfies Partial<Record<PlaygroundApiErrorCode, string>>;
