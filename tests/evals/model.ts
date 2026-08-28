/**
 * The model interface for the eval harness, with two implementations:
 *
 * - OpenRouterResponder (responders/openrouter.ts): live model via the
 *   OpenRouter chat-completions API.
 * - MockResponder (responders/mock/responder.ts): deterministic,
 *   template-based responder exercising every runner path.
 *
 * This module is a pure re-export facade; run.ts and harness.test.ts import
 * from here.
 */
export { MockResponder } from "./responders/mock/responder.ts";
export { CALL_TIMEOUT_MS, DEFAULT_MODEL, OpenRouterResponder } from "./responders/openrouter.ts";
export type { Responder } from "./responders/types.ts";
