/**
 * Thin fetch client for POST /v1/generate.
 * VITE_PLAYGROUND_API_MODE=mock returns a canned envelope (dev default).
 */

import type { SpecError } from "@ggsvelte/spec";

import {
  parsePlaygroundAgentEnvelope,
  type PlaygroundAgentEnvelope,
} from "./playground-agent-envelope";
import type { PlaygroundAgentErrorCode } from "./playground-agent-state";
import { messageForAgentError } from "./playground-agent-state";
import type { PlaygroundDatasetId } from "./playground-dataset-schemas";
import { mockGenerateEnvelope } from "./playground-prompts";

export const DEFAULT_PLAYGROUND_API_URL = "https://playground-api.ggsvelte.sh";

export interface GenerateChartRequest {
  readonly prompt: string;
  readonly datasetId: PlaygroundDatasetId;
  readonly currentSpec?: unknown;
  readonly priorSpec?: unknown;
  readonly priorErrors?: readonly SpecError[];
}

export type GenerateChartResult =
  | {
      readonly ok: true;
      readonly model: string;
      readonly envelope: PlaygroundAgentEnvelope;
      readonly rawEnvelope: unknown;
    }
  | {
      readonly ok: false;
      readonly code: PlaygroundAgentErrorCode;
      readonly message: string;
      readonly retryAfterSeconds?: number;
    };

export interface GenerateChartOptions {
  readonly apiUrl?: string;
  readonly mode?: "live" | "mock";
  readonly fetchFn?: typeof fetch;
  readonly signal?: AbortSignal;
}

function resolveMode(explicit?: "live" | "mock"): "live" | "mock" {
  if (explicit !== undefined) return explicit;
  // Test/rollout hook: ?gg-api=live|mock overrides the build-time mode.
  // Transport-only switch — validation and the pipeline are identical.
  try {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("gg-api");
      if (param === "live") return "live";
      if (param === "mock") return "mock";
    }
  } catch {
    // ignore
  }
  try {
    const env = (
      import.meta as ImportMeta & {
        env?: { DEV?: boolean; MODE?: string; VITE_PLAYGROUND_API_MODE?: string };
      }
    ).env;
    const mode = env?.VITE_PLAYGROUND_API_MODE;
    if (mode === "live") return "live";
    if (mode === "mock") return "mock";
    // Dev default is mock so bun dev never needs the worker.
    if (env?.DEV === true || env?.MODE === "development") return "mock";
  } catch {
    // ignore
  }
  return "mock";
}

function resolveApiUrl(explicit?: string): string {
  if (explicit !== undefined && explicit !== "") return explicit.replace(/\/$/u, "");
  try {
    const env = (
      import.meta as ImportMeta & {
        env?: { VITE_PLAYGROUND_API_URL?: string };
      }
    ).env;
    const url = env?.VITE_PLAYGROUND_API_URL;
    if (typeof url === "string" && url !== "") return url.replace(/\/$/u, "");
  } catch {
    // ignore
  }
  return DEFAULT_PLAYGROUND_API_URL;
}

function mapApiErrorCode(code: unknown): PlaygroundAgentErrorCode {
  const known: PlaygroundAgentErrorCode[] = [
    "bad_request",
    "prompt_too_long",
    "unknown_dataset",
    "origin_forbidden",
    "rate_limited",
    "upstream_rate_limited",
    "upstream_error",
    "bad_output",
    "disabled",
  ];
  if (typeof code === "string" && (known as string[]).includes(code)) {
    return code as PlaygroundAgentErrorCode;
  }
  return "upstream_error";
}

export async function generateChart(
  request: GenerateChartRequest,
  options: GenerateChartOptions = {},
): Promise<GenerateChartResult> {
  const mode = resolveMode(options.mode);
  if (mode === "mock") {
    const envelope = mockGenerateEnvelope(request.datasetId);
    return {
      ok: true,
      model: "mock",
      envelope,
      rawEnvelope: {
        spec: envelope.spec,
        interactions: envelope.interactions,
        title: envelope.title,
      },
    };
  }

  const apiUrl = resolveApiUrl(options.apiUrl);
  const fetchFn = options.fetchFn ?? fetch;

  // 30s client ceiling so a hung worker cannot leave the UI busy forever;
  // a timeout rejection maps to the degraded "network" path below.
  const signal =
    options.signal === undefined
      ? AbortSignal.timeout(30_000)
      : typeof AbortSignal.any === "function"
        ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
        : options.signal;

  let response: Response;
  try {
    response = await fetchFn(`${apiUrl}/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: request.prompt,
        datasetId: request.datasetId,
        ...(request.currentSpec === undefined ? {} : { currentSpec: request.currentSpec }),
        ...(request.priorSpec === undefined ? {} : { priorSpec: request.priorSpec }),
        ...(request.priorErrors === undefined ? {} : { priorErrors: request.priorErrors }),
      }),
      signal,
    });
  } catch (error) {
    // CSP block, DNS, offline, AbortError — TypeError before HTTP status (OV8-2).
    // DOMException extends Error, so one branch covers both.
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        code: "aborted",
        message: messageForAgentError("aborted"),
      };
    }
    return {
      ok: false,
      code: "network",
      message: messageForAgentError("network"),
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      code: "bad_output",
      message: messageForAgentError("bad_output"),
    };
  }

  if (
    body !== null &&
    typeof body === "object" &&
    (body as { ok?: unknown }).ok === true &&
    "envelope" in (body as object)
  ) {
    const record = body as { model?: unknown; envelope: unknown };
    const parsed = parsePlaygroundAgentEnvelope(record.envelope);
    if (!parsed.ok) {
      return {
        ok: false,
        code: "bad_output",
        message: parsed.message,
      };
    }
    return {
      ok: true,
      model: typeof record.model === "string" ? record.model : "unknown",
      envelope: parsed.envelope,
      rawEnvelope: record.envelope,
    };
  }

  const error =
    body !== null && typeof body === "object" && "error" in (body as object)
      ? (body as { error: Record<string, unknown> }).error
      : null;
  const code = mapApiErrorCode(error?.code);
  const retryAfter =
    typeof error?.retryAfterSeconds === "number" ? error.retryAfterSeconds : undefined;
  return {
    ok: false,
    code,
    message: typeof error?.message === "string" ? error.message : messageForAgentError(code),
    ...(retryAfter === undefined ? {} : { retryAfterSeconds: retryAfter }),
  };
}
