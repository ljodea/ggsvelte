import { describe, expect, test } from "bun:test";

import {
  agentIsBusy,
  beginAgentRequest,
  completeAgentSuccess,
  createPlaygroundAgentState,
  escalatedPhaseLine,
  failAgent,
  messageForAgentError,
  setAgentRepairing,
  setAgentValidating,
} from "../apps/docs/src/lib/playground-agent-state";
import { defaultPlaygroundInteractions } from "../apps/docs/src/lib/playground-agent-envelope";
import { generateChart } from "../apps/docs/src/lib/playground-agent-client";

describe("playground agent state", () => {
  test("walks idle → awaiting → validating → repairing → idle|failed", () => {
    let state = createPlaygroundAgentState();
    expect(agentIsBusy(state)).toBe(false);
    state = beginAgentRequest(state, { now: 1000 });
    expect(state.phase).toBe("awaiting-llm");
    expect(agentIsBusy(state)).toBe(true);
    state = setAgentValidating(state);
    expect(state.phaseLine).toContain("Checking");
    state = setAgentRepairing(state);
    expect(state.repairUsed).toBe(true);
    expect(state.phaseLine).toContain("Fixing once");
    state = completeAgentSuccess(state, {
      spec: {},
      interactions: defaultPlaygroundInteractions(),
      title: null,
    });
    expect(state.phase).toBe("idle");
    expect(agentIsBusy(state)).toBe(false);
  });

  test("escalates phase line after 10s", () => {
    const state = beginAgentRequest(createPlaygroundAgentState(), { now: 0 });
    expect(escalatedPhaseLine(state, 9_000)).toBeNull();
    expect(escalatedPhaseLine(state, 10_001)).toContain("Free-tier");
  });

  test("maps disabled and network messages", () => {
    expect(messageForAgentError("disabled")).toContain("copy-to-your-agent");
    expect(messageForAgentError("network")).toContain("Could not reach");
  });

  test("failAgent records taxonomy", () => {
    const state = failAgent(beginAgentRequest(createPlaygroundAgentState()), {
      code: "rate_limited",
      message: "slow down",
      retryAfterSeconds: 24,
    });
    expect(state.phase).toBe("failed");
    expect(state.failure?.retryAfterSeconds).toBe(24);
  });
});

describe("playground agent client", () => {
  test("mock mode returns a canned envelope without fetch", async () => {
    const result = await generateChart({ prompt: "hi", datasetId: "penguins" }, { mode: "mock" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model).toBe("mock");
    expect(result.envelope.spec).toBeDefined();
  });

  test("fetch rejection maps to network (OV8-2)", async () => {
    const result = await generateChart(
      { prompt: "hi", datasetId: "penguins" },
      {
        mode: "live",
        apiUrl: "https://example.invalid",
        fetchFn: async () => {
          throw new TypeError("Failed to fetch");
        },
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("network");
  });

  test("abort maps to aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await generateChart(
      { prompt: "hi", datasetId: "penguins" },
      {
        mode: "live",
        apiUrl: "https://example.test",
        signal: controller.signal,
        fetchFn: async (_url, init) => {
          if (init?.signal?.aborted) {
            const err = new Error("aborted");
            err.name = "AbortError";
            throw err;
          }
          return new Response("{}", { status: 200 });
        },
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("aborted");
  });
});

describe("generateChart live-mode response handling", () => {
  test("200 ok body parses envelope and model", async () => {
    const envelope = {
      spec: { edition: 2, data: { name: "penguins" }, layers: [{ geom: "point" }] },
      interactions: { inspect: true },
      title: "T",
    };
    const result = await generateChart(
      { prompt: "hi", datasetId: "penguins" },
      {
        mode: "live",
        apiUrl: "https://example.test",
        fetchFn: () =>
          Promise.resolve(
            new Response(JSON.stringify({ ok: true, model: "m/x", envelope }), { status: 200 }),
          ),
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model).toBe("m/x");
    expect(result.envelope.interactions.inspect).toBe(true);
  });

  test("429 error body maps code and passes retryAfterSeconds through", async () => {
    const result = await generateChart(
      { prompt: "hi", datasetId: "penguins" },
      {
        mode: "live",
        apiUrl: "https://example.test",
        fetchFn: () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                ok: false,
                error: { code: "rate_limited", message: "slow down", retryAfterSeconds: 42 },
              }),
              { status: 429 },
            ),
          ),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("rate_limited");
    expect(result.retryAfterSeconds).toBe(42);
  });

  test("unrecognized error codes fall back to upstream_error", async () => {
    const result = await generateChart(
      { prompt: "hi", datasetId: "penguins" },
      {
        mode: "live",
        apiUrl: "https://example.test",
        fetchFn: () =>
          Promise.resolve(
            new Response(JSON.stringify({ ok: false, error: { code: "mystery" } }), {
              status: 500,
            }),
          ),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("upstream_error");
  });

  test("non-JSON response body maps to bad_output", async () => {
    const result = await generateChart(
      { prompt: "hi", datasetId: "penguins" },
      {
        mode: "live",
        apiUrl: "https://example.test",
        fetchFn: () => Promise.resolve(new Response("<html>oops</html>", { status: 200 })),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("bad_output");
  });
});
