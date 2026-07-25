/**
 * Agent request machine — separate from PlaygroundState (chart source of truth).
 * idle → awaiting-llm → validating → (repairing once) → idle | failed
 */

import type { SpecError } from "@ggsvelte/spec";

import type { PlaygroundAgentEnvelope } from "./playground-agent-envelope";
import {
  type PlaygroundApiErrorCode,
  SHARED_API_ERROR_MESSAGES,
} from "./playground-api-error-codes";

export type PlaygroundAgentPhase =
  | "idle"
  | "awaiting-llm"
  | "validating"
  | "repairing"
  | "drawing"
  | "failed";

/**
 * Failures the client raises on its own — never sent by the worker.
 * `service_error`: the service failed or was intercepted, so no worker body
 * came back at all.
 */
export type PlaygroundAgentLocalErrorCode =
  | "service_error"
  | "network"
  | "validation"
  | "pipeline"
  | "aborted";

/** Every wire code (#695) plus the client-only ones. */
export type PlaygroundAgentErrorCode = PlaygroundApiErrorCode | PlaygroundAgentLocalErrorCode;

export interface PlaygroundAgentFailure {
  readonly code: PlaygroundAgentErrorCode;
  readonly message: string;
  readonly retryAfterSeconds?: number;
  /** Raw SpecError[] for the Details disclosure (copyable handoff). */
  readonly details?: readonly SpecError[];
}

export interface PlaygroundAgentState {
  readonly phase: PlaygroundAgentPhase;
  readonly phaseLine: string;
  readonly failure: PlaygroundAgentFailure | null;
  readonly repairUsed: boolean;
  readonly lastEnvelope: PlaygroundAgentEnvelope | null;
  readonly startedAt: number | null;
  readonly exampleMode: boolean;
}

export function createPlaygroundAgentState(): PlaygroundAgentState {
  return {
    phase: "idle",
    phaseLine: "",
    failure: null,
    repairUsed: false,
    lastEnvelope: null,
    startedAt: null,
    exampleMode: false,
  };
}

export function agentIsBusy(state: PlaygroundAgentState): boolean {
  return (
    state.phase === "awaiting-llm" ||
    state.phase === "validating" ||
    state.phase === "repairing" ||
    state.phase === "drawing"
  );
}

export function beginAgentRequest(
  state: PlaygroundAgentState,
  options: { readonly exampleMode?: boolean; readonly now?: number } = {},
): PlaygroundAgentState {
  return {
    ...state,
    phase: "awaiting-llm",
    phaseLine: options.exampleMode === true ? "Loading example…" : "Generating…",
    failure: null,
    repairUsed: false,
    lastEnvelope: null,
    startedAt: options.now ?? Date.now(),
    exampleMode: options.exampleMode === true,
  };
}

export function setAgentValidating(state: PlaygroundAgentState): PlaygroundAgentState {
  return {
    ...state,
    phase: "validating",
    phaseLine: "Checking the chart…",
  };
}

export function setAgentRepairing(state: PlaygroundAgentState): PlaygroundAgentState {
  return {
    ...state,
    phase: "repairing",
    phaseLine: "Fixing once…",
    repairUsed: true,
  };
}

export function setAgentDrawing(state: PlaygroundAgentState): PlaygroundAgentState {
  return {
    ...state,
    phase: "drawing",
    phaseLine: "Drawing…",
  };
}

export function completeAgentSuccess(
  state: PlaygroundAgentState,
  envelope: PlaygroundAgentEnvelope,
): PlaygroundAgentState {
  return {
    ...state,
    phase: "idle",
    phaseLine: "",
    failure: null,
    lastEnvelope: envelope,
    startedAt: null,
    exampleMode: false,
  };
}

export function failAgent(
  state: PlaygroundAgentState,
  failure: PlaygroundAgentFailure,
): PlaygroundAgentState {
  return {
    ...state,
    phase: "failed",
    phaseLine: "",
    failure,
    startedAt: null,
    exampleMode: false,
  };
}

/** Escalated wait copy after ~10s (free-tier honesty). */
export function escalatedPhaseLine(
  state: PlaygroundAgentState,
  now: number = Date.now(),
): string | null {
  if (state.startedAt === null || !agentIsBusy(state)) return null;
  if (state.exampleMode) return null;
  if (now - state.startedAt < 10_000) return null;
  return "Free-tier models can be slow — still working.";
}

export function resolvePhaseLine(state: PlaygroundAgentState, now: number = Date.now()): string {
  return escalatedPhaseLine(state, now) ?? state.phaseLine;
}

/** User-facing failure messages (OV8-1 budget copy, network, etc.). */
export function messageForAgentError(code: PlaygroundAgentErrorCode, fallback?: string): string {
  switch (code) {
    case "rate_limited":
    case "upstream_rate_limited":
      return fallback ?? SHARED_API_ERROR_MESSAGES.rate_limited;
    case "disabled":
      return SHARED_API_ERROR_MESSAGES.disabled;
    case "network":
      return "Could not reach the generate service. Check your connection, or try a sample chart.";
    case "validation":
      return fallback ?? "The generated chart did not pass validation.";
    case "pipeline":
      return fallback ?? "The chart could not be drawn. The previous chart is still shown.";
    case "aborted":
      return "Generation cancelled.";
    case "bad_output":
      return "The model returned an unusable chart. Try a sample or rephrase.";
    case "upstream_error":
      return SHARED_API_ERROR_MESSAGES.upstream_error;
    case "service_error":
      // Edge outage, proxy, or captive portal: nothing the user can rephrase.
      return "The generate service is unavailable. Try again shortly, or use a sample chart.";
    case "not_found":
    case "method_not_allowed":
      return "The generate service is misconfigured. Use a sample chart or copy the agent prompt.";
    case "origin_forbidden":
      return "This origin cannot call live generation. Use a sample or copy the agent prompt.";
    case "prompt_too_long":
      return SHARED_API_ERROR_MESSAGES.prompt_too_long;
    case "unknown_dataset":
      return SHARED_API_ERROR_MESSAGES.unknown_dataset;
    default:
      return fallback ?? "Generation failed. Try a sample chart or copy the agent prompt.";
  }
}
