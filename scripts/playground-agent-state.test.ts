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
