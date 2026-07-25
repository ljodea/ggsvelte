/**
 * Pure handleGenerate(request, env) — unit-testable without miniflare.
 */

import { isPlaygroundDatasetId } from "../../../apps/docs/src/lib/playground-dataset-schemas";
import { corsHeaders, errorCorsHeaders, matchCorsOrigin } from "./cors";
import { apiError, SAFE_MESSAGES, statusForError, type PlaygroundApiResponse } from "./errors";
import {
  buildChatMessages,
  CURRENT_SPEC_MAX_BYTES,
  MAX_INPUT_TOKENS,
  PRIOR_ERRORS_MAX,
  PRIOR_SPEC_MAX_BYTES,
  PROMPT_MAX_CHARS,
  totalMessageTokens,
  type ChatMessage,
} from "./prompt";

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface PlaygroundApiEnv {
  readonly OPENROUTER_API_KEY?: string;
  readonly MODEL_ALLOWLIST?: string;
  readonly DISABLED?: string;
  readonly RATE_LIMIT_IP?: RateLimitBinding;
  readonly RATE_LIMIT_GLOBAL?: RateLimitBinding;
  /** Injectable for tests. */
  readonly fetch?: typeof fetch;
  readonly log?: (line: Record<string, unknown>) => void;
  readonly now?: () => number;
}

export interface GenerateRequestBody {
  readonly prompt?: unknown;
  readonly datasetId?: unknown;
  readonly currentSpec?: unknown;
  readonly priorSpec?: unknown;
  readonly priorErrors?: unknown;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** One request body ceiling checked before parsing (cheap DoS guard). */
const MAX_REQUEST_BODY_BYTES = 64 * 1024;
/** Repair diagnostics are small by construction; this only bounds abuse. */
const PRIOR_ERRORS_MAX_BYTES = 8 * 1024;
export const DEFAULT_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

function byteLength(value: unknown): number | null {
  // JSON.stringify can throw RangeError on adversarially deep input — treat as oversized.
  try {
    return new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value))
      .byteLength;
  } catch {
    return null;
  }
}

function exceedsBytes(value: unknown, max: number): boolean {
  const bytes = byteLength(value);
  return bytes === null || bytes > max;
}

function parseAllowlist(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") return [...DEFAULT_MODELS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function jsonResponse(
  body: PlaygroundApiResponse,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Best-effort belt-and-braces leak check on the serialized response.
 * The key never enters model context, so this mainly guards future refactors;
 * a legitimate envelope matching these patterns is dropped as bad_output —
 * an accepted false-positive cost (contract test).
 */
export function sanitizeForLeak(text: string): boolean {
  if (/sk-[a-zA-Z0-9_-]{10,}/u.test(text)) return false;
  if (/Authorization/iu.test(text) && /Bearer/iu.test(text)) return false;
  if (/OPENROUTER/iu.test(text) && /key/iu.test(text)) return false;
  return true;
}

export async function handleGenerate(request: Request, env: PlaygroundApiEnv): Promise<Response> {
  const started = (env.now ?? Date.now)();
  const origin = request.headers.get("Origin");
  const matchedOrigin = matchCorsOrigin(origin);
  // CORS headers only when origin matched; missing Origin (same-origin tools) allowed.
  const cors = corsHeaders(matchedOrigin);

  if (request.method === "OPTIONS") {
    // Preflight is approved for every origin, including unlisted ones. The
    // allowlist is enforced on the actual request below; a 403 preflight is a
    // browser-level network error, which would leave the typed origin_forbidden
    // body unreadable and force the client into a bogus `network` code (#697).
    return new Response(null, { status: 204, headers: corsHeaders(matchedOrigin ?? origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      apiError("method_not_allowed", SAFE_MESSAGES.method_not_allowed),
      statusForError("method_not_allowed"),
      { ...cors, Allow: "POST, OPTIONS" },
    );
  }

  if (origin !== null && matchedOrigin === null) {
    return jsonResponse(
      apiError("origin_forbidden", SAFE_MESSAGES.origin_forbidden),
      statusForError("origin_forbidden"),
      errorCorsHeaders(origin),
    );
  }

  // Fail CLOSED: a key with no rate limiting is an unshaped public proxy.
  // Config drift (missing/misspelled binding) must pause generation loudly,
  // never silently disable traffic shaping.
  if (
    env.OPENROUTER_API_KEY !== undefined &&
    env.OPENROUTER_API_KEY !== "" &&
    (env.RATE_LIMIT_IP === undefined || env.RATE_LIMIT_GLOBAL === undefined)
  ) {
    logOutcome(env, {
      model: null,
      outcome: "disabled",
      repair_used: false,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("disabled", SAFE_MESSAGES.disabled),
      statusForError("disabled"),
      cors,
    );
  }

  if (env.DISABLED === "1" || env.DISABLED === "true") {
    logOutcome(env, {
      model: null,
      outcome: "disabled",
      repair_used: false,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("disabled", SAFE_MESSAGES.disabled),
      statusForError("disabled"),
      cors,
    );
  }

  // Rate limits (traffic shaping only — $1 cap is the hard backstop).
  const ip = clientIp(request);
  if (env.RATE_LIMIT_IP !== undefined) {
    const ipResult = await env.RATE_LIMIT_IP.limit({ key: ip });
    if (!ipResult.success) {
      logOutcome(env, {
        model: null,
        outcome: "rate_limited",
        repair_used: false,
        duration: (env.now ?? Date.now)() - started,
      });
      return jsonResponse(apiError("rate_limited", SAFE_MESSAGES.rate_limited, 60), 429, {
        ...cors,
        "Retry-After": "60",
      });
    }
  }
  if (env.RATE_LIMIT_GLOBAL !== undefined) {
    const globalResult = await env.RATE_LIMIT_GLOBAL.limit({ key: "global" });
    if (!globalResult.success) {
      logOutcome(env, {
        model: null,
        outcome: "rate_limited",
        repair_used: false,
        duration: (env.now ?? Date.now)() - started,
      });
      return jsonResponse(apiError("rate_limited", SAFE_MESSAGES.rate_limited, 60), 429, {
        ...cors,
        "Retry-After": "60",
      });
    }
  }

  // Content-Length is a cheap pre-filter only — it is client-supplied and absent
  // entirely under chunked transfer-encoding. The authoritative check is on the
  // bytes actually read, below.
  const contentLength = Number(request.headers.get("Content-Length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.oversized_input), 400, cors);
  }

  let body: GenerateRequestBody;
  try {
    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_REQUEST_BODY_BYTES) {
      return jsonResponse(apiError("bad_request", SAFE_MESSAGES.oversized_input), 400, cors);
    }
    body = JSON.parse(new TextDecoder().decode(raw)) as GenerateRequestBody;
  } catch {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.bad_request), 400, cors);
  }

  if (!isObject(body)) {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.bad_request), 400, cors);
  }

  if (typeof body.prompt !== "string") {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.bad_request), 400, cors);
  }
  if (body.prompt.length > PROMPT_MAX_CHARS) {
    return jsonResponse(apiError("prompt_too_long", SAFE_MESSAGES.prompt_too_long), 400, cors);
  }
  if (body.prompt.trim() === "") {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.bad_request), 400, cors);
  }

  if (typeof body.datasetId !== "string" || !isPlaygroundDatasetId(body.datasetId)) {
    return jsonResponse(apiError("unknown_dataset", SAFE_MESSAGES.unknown_dataset), 400, cors);
  }

  if (body.currentSpec !== undefined && exceedsBytes(body.currentSpec, CURRENT_SPEC_MAX_BYTES)) {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.oversized_input), 400, cors);
  }
  if (body.priorSpec !== undefined && exceedsBytes(body.priorSpec, PRIOR_SPEC_MAX_BYTES)) {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.oversized_input), 400, cors);
  }

  let priorErrors: unknown[] | undefined;
  if (body.priorErrors !== undefined) {
    if (!Array.isArray(body.priorErrors)) {
      return jsonResponse(apiError("bad_request", SAFE_MESSAGES.bad_request), 400, cors);
    }
    priorErrors = body.priorErrors.slice(0, PRIOR_ERRORS_MAX);
    // Count-capped is not size-capped: buildChatMessages stringifies these, and
    // adversarially deep/large entries would throw RangeError (a 500) inside the
    // token check rather than being rejected here.
    if (exceedsBytes(priorErrors, PRIOR_ERRORS_MAX_BYTES)) {
      return jsonResponse(apiError("bad_request", SAFE_MESSAGES.oversized_input), 400, cors);
    }
  }

  const repairUsed = body.priorSpec !== undefined && priorErrors !== undefined;
  const { messages } = buildChatMessages({
    datasetId: body.datasetId,
    prompt: body.prompt,
    currentSpec: body.currentSpec,
    priorEnvelope: body.priorSpec,
    priorErrors,
  });

  if (totalMessageTokens(messages) > MAX_INPUT_TOKENS) {
    return jsonResponse(apiError("bad_request", SAFE_MESSAGES.oversized_input), 400, cors);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    // Without a key, fail as disabled (dev / pre-rollout).
    logOutcome(env, {
      model: null,
      outcome: "disabled",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("disabled", SAFE_MESSAGES.disabled),
      statusForError("disabled"),
      cors,
    );
  }

  const models = parseAllowlist(env.MODEL_ALLOWLIST);
  const fetchFn = env.fetch ?? fetch;

  let upstream: Response;
  try {
    upstream = await fetchFn(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ggsvelte.sh",
        "X-Title": "ggsvelte playground",
      },
      body: JSON.stringify({
        models,
        messages: messages as ChatMessage[],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    logOutcome(env, {
      model: null,
      outcome: "upstream_error",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("upstream_error", SAFE_MESSAGES.upstream_error),
      statusForError("upstream_error"),
      cors,
    );
  }

  if (upstream.status === 429) {
    logOutcome(env, {
      model: null,
      outcome: "upstream_rate_limited",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("upstream_rate_limited", SAFE_MESSAGES.upstream_rate_limited, 60),
      429,
      { ...cors, "Retry-After": "60" },
    );
  }

  if (!upstream.ok) {
    logOutcome(env, {
      model: null,
      outcome: "upstream_error",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("upstream_error", SAFE_MESSAGES.upstream_error),
      statusForError("upstream_error"),
      cors,
    );
  }

  let completion: unknown;
  try {
    completion = await upstream.json();
  } catch {
    logOutcome(env, {
      model: null,
      outcome: "bad_output",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("bad_output", SAFE_MESSAGES.bad_output),
      statusForError("bad_output"),
      cors,
    );
  }

  // `models` requests provider-side fallback, so the first entry is not
  // necessarily what answered. Attributing output — and the outcome log that
  // tunes MODEL_ALLOWLIST — to a guess is worse than reporting null (#697).
  const model =
    isObject(completion) && typeof completion.model === "string" && completion.model !== ""
      ? completion.model
      : null;

  const content = extractContent(completion);
  if (content === null) {
    logOutcome(env, {
      model,
      outcome: "bad_output",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("bad_output", SAFE_MESSAGES.bad_output),
      statusForError("bad_output"),
      cors,
    );
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(content) as unknown;
  } catch {
    logOutcome(env, {
      model,
      outcome: "bad_output",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("bad_output", SAFE_MESSAGES.bad_output),
      statusForError("bad_output"),
      cors,
    );
  }

  if (!isObject(envelope)) {
    logOutcome(env, {
      model,
      outcome: "bad_output",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("bad_output", SAFE_MESSAGES.bad_output),
      statusForError("bad_output"),
      cors,
    );
  }

  // Semantic validation stays client-side — worker only checks JSON object.
  const responseBody: PlaygroundApiResponse = {
    ok: true,
    model,
    envelope,
  };
  const serialized = JSON.stringify(responseBody);
  if (!sanitizeForLeak(serialized)) {
    logOutcome(env, {
      model,
      outcome: "bad_output",
      repair_used: repairUsed,
      duration: (env.now ?? Date.now)() - started,
    });
    return jsonResponse(
      apiError("bad_output", SAFE_MESSAGES.bad_output),
      statusForError("bad_output"),
      cors,
    );
  }

  logOutcome(env, {
    model,
    outcome: "ok",
    repair_used: repairUsed,
    duration: (env.now ?? Date.now)() - started,
  });

  return new Response(serialized, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}

function extractContent(completion: unknown): string | null {
  if (!isObject(completion)) return null;
  const choices = completion.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  // Array.isArray() narrows `unknown` to `any[]`, so re-annotate to keep the
  // element unknown until isObject() proves its shape.
  const first: unknown = choices[0];
  if (!isObject(first)) return null;
  const message = first.message;
  if (!isObject(message)) return null;
  const content = message.content;
  if (typeof content === "string" && content.trim() !== "") return content;
  return null;
}

function logOutcome(
  env: PlaygroundApiEnv,
  line: {
    model: string | null;
    outcome: string;
    repair_used: boolean;
    duration: number;
  },
): void {
  // Count-only structured logging — no prompts, IPs, or user content (P8-A).
  const payload = {
    model: line.model,
    outcome: line.outcome,
    repair_used: line.repair_used,
    duration: line.duration,
  };
  if (env.log !== undefined) {
    env.log(payload);
    return;
  }
  console.log(JSON.stringify(payload));
}
