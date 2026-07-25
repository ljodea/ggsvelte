import { describe, expect, test } from "bun:test";

import {
  PLAYGROUND_API_ERROR_CODES,
  SHARED_API_ERROR_MESSAGES,
} from "../apps/docs/src/lib/playground-api-error-codes";
import { generateChart } from "../apps/docs/src/lib/playground-agent-client";
import { messageForAgentError } from "../apps/docs/src/lib/playground-agent-state";
import { SAFE_MESSAGES, statusForError } from "../workers/playground-api/src/errors";

/** Live-mode generateChart against a worker that answered with `code`. */
async function codeFromWorkerBody(code: string): Promise<string> {
  const result = await generateChart(
    { prompt: "hi", datasetId: "penguins" },
    {
      mode: "live",
      apiUrl: "https://example.test",
      fetchFn: () =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: false, error: { code, message: "boom" } }), {
            status: 400,
          }),
        ),
    },
  );
  return result.ok ? "ok" : result.code;
}

describe("playground wire error-code contract (#695)", () => {
  // Deployed clients recognise exactly these codes, so dropping or renaming one
  // is a breaking wire change and has to be a deliberate edit here.
  test("the wire union is locked to the codes both sides were hand-copying", () => {
    expect(PLAYGROUND_API_ERROR_CODES.toSorted()).toEqual([
      "bad_output",
      "bad_request",
      "disabled",
      "method_not_allowed",
      "not_found",
      "origin_forbidden",
      "prompt_too_long",
      "rate_limited",
      "unknown_dataset",
      "upstream_error",
      "upstream_rate_limited",
    ]);
  });

  test("the client round-trips every wire code instead of degrading it", async () => {
    for (const code of PLAYGROUND_API_ERROR_CODES) {
      expect(await codeFromWorkerBody(code)).toBe(code);
    }
  });

  test("an unknown code still degrades to upstream_error", async () => {
    expect(await codeFromWorkerBody("teapot_on_fire")).toBe("upstream_error");
  });

  test("the worker gives every wire code a status and a safe message", () => {
    for (const code of PLAYGROUND_API_ERROR_CODES) {
      expect(statusForError(code)).toBeGreaterThanOrEqual(400);
      expect(SAFE_MESSAGES[code]).toBeTruthy();
    }
  });

  test("shared copy is byte-identical on the worker and the client", () => {
    const shared = Object.entries(SHARED_API_ERROR_MESSAGES);
    expect(shared.length).toBeGreaterThan(0);
    for (const [code, message] of shared) {
      expect(SAFE_MESSAGES[code as keyof typeof SAFE_MESSAGES]).toBe(message);
      expect(messageForAgentError(code as (typeof PLAYGROUND_API_ERROR_CODES)[number])).toBe(
        message,
      );
    }
  });

  test("client-only codes are not part of the wire union", () => {
    for (const local of ["service_error", "network", "validation", "pipeline", "aborted"]) {
      expect((PLAYGROUND_API_ERROR_CODES as readonly string[]).includes(local)).toBe(false);
    }
  });
});
