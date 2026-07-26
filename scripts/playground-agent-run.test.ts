import { describe, expect, test } from "bun:test";

import type {
  GenerateChartRequest,
  GenerateChartResult,
} from "../apps/docs/src/lib/playground-agent-client";
import {
  defaultPlaygroundInteractions,
  type PlaygroundAgentEnvelope,
} from "../apps/docs/src/lib/playground-agent-envelope";
import {
  createPlaygroundAgentState,
  type PlaygroundAgentState,
} from "../apps/docs/src/lib/playground-agent-state";
import {
  rateLimitLabelFor,
  runPlaygroundAgentRun,
} from "../apps/docs/src/lib/playground-agent-run";
import type { PlaygroundExamplePrompt } from "../apps/docs/src/lib/playground-prompts";

const validSpec = {
  edition: 2,
  data: { name: "penguins" },
  layers: [
    {
      geom: "point",
      aes: { x: { field: "flipper" }, y: { field: "mass" } },
    },
  ],
};

const invalidFieldSpec = {
  edition: 2,
  data: { name: "penguins" },
  layers: [
    {
      geom: "point",
      aes: { x: { field: "nope" }, y: { field: "mass" } },
    },
  ],
};

/** Seed-bound (non-repairable): huge labs.subtitle. */
const seedBoundSpec = {
  ...validSpec,
  labs: { subtitle: "x".repeat(3000) },
};

function envelope(spec: unknown, title: string | null = null): PlaygroundAgentEnvelope {
  return {
    spec,
    interactions: defaultPlaygroundInteractions(),
    title,
  };
}

function okGenerate(env: PlaygroundAgentEnvelope, model = "live"): GenerateChartResult {
  return {
    ok: true,
    model,
    envelope: env,
    rawEnvelope: {
      spec: env.spec,
      interactions: env.interactions,
      title: env.title,
    },
  };
}

function failGenerate(
  code: "rate_limited" | "upstream_rate_limited" | "network" | "upstream_error",
  message: string,
  retryAfterSeconds?: number,
): GenerateChartResult {
  return {
    ok: false,
    code,
    message,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}

function phasesOf(agents: readonly PlaygroundAgentState[]): string[] {
  return agents.map((a) => a.phase);
}

function baseInput(
  overrides: Partial<Parameters<typeof runPlaygroundAgentRun>[0]> = {},
): Parameters<typeof runPlaygroundAgentRun>[0] {
  return {
    userPrompt: "scatter penguins",
    dataset: "penguins",
    getCurrentSpec: () => ({ elided: true }),
    isStale: () => false,
    initialAgent: createPlaygroundAgentState(),
    ...overrides,
  };
}

describe("rateLimitLabelFor", () => {
  test("formats countdown label", () => {
    expect(rateLimitLabelFor(24)).toBe("Try again in 24s");
  });
});

describe("runPlaygroundAgentRun", () => {
  test("happy path: generate → validate → ready_to_stage; agent stays validating (not drawing)", async () => {
    const agents: PlaygroundAgentState[] = [];
    const calls: GenerateChartRequest[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: (req) => {
        calls.push(req);
        return Promise.resolve(okGenerate(envelope(validSpec, "Penguins")));
      },
      now: () => 1_000,
    });
    expect(outcome.kind).toBe("ready_to_stage");
    if (outcome.kind !== "ready_to_stage") return;
    expect(outcome.mockNotice).toBe(false);
    expect(outcome.pendingSuccess.title).toBe("Penguins");
    expect(outcome.seed.version).toBe(1);
    expect(outcome.seed.spec).toBeDefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.currentSpec).toEqual({ elided: true });
    expect(phasesOf(agents)).toEqual(["awaiting-llm", "validating"]);
    expect(agents.at(-1)?.phase).toBe("validating");
  });

  test("first-generate rate_limited sets rateLimit UX with retryAfterSeconds", async () => {
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => Promise.resolve(failGenerate("rate_limited", "slow", 24)),
      now: () => 5_000,
    });
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") return;
    expect(outcome.rateLimit).toEqual({
      until: 5_000 + 24_000,
      label: "Try again in 24s",
    });
    expect(agents.at(-1)?.phase).toBe("failed");
    expect(agents.at(-1)?.failure?.retryAfterSeconds).toBe(24);
  });

  test("upstream_rate_limited defaults retry to 60s when absent", async () => {
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: () => {},
      generateChart: () => Promise.resolve(failGenerate("upstream_rate_limited", "upstream slow")),
      now: () => 0,
    });
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") return;
    expect(outcome.rateLimit).toEqual({
      until: 60_000,
      label: "Try again in 60s",
    });
  });

  test("non-rate-limit first failure has no rateLimit fields", async () => {
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: () => {},
      generateChart: () => Promise.resolve(failGenerate("network", "down")),
    });
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") return;
    expect(outcome.rateLimit).toBeUndefined();
  });

  test("seed-bound validation fail is not repaired (no second generate)", async () => {
    const calls: GenerateChartRequest[] = [];
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: (req) => {
        calls.push(req);
        return Promise.resolve(okGenerate(envelope(seedBoundSpec)));
      },
    });
    expect(outcome.kind).toBe("failed");
    expect(calls).toHaveLength(1);
    expect(agents.at(-1)?.failure?.code).toBe("validation");
  });

  test("repair succeeds: onAgent includes repairing; final phase stays repairing", async () => {
    const agents: PlaygroundAgentState[] = [];
    let n = 0;
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: (req) => {
        n += 1;
        if (n === 1) {
          expect(req.priorErrors).toBeUndefined();
          return Promise.resolve(okGenerate(envelope(invalidFieldSpec)));
        }
        expect(req.priorErrors?.length).toBeGreaterThan(0);
        expect(req.priorSpec).toBeDefined();
        return Promise.resolve(okGenerate(envelope(validSpec, "Fixed")));
      },
    });
    expect(outcome.kind).toBe("ready_to_stage");
    if (outcome.kind !== "ready_to_stage") return;
    expect(outcome.pendingSuccess.title).toBe("Fixed");
    expect(phasesOf(agents)).toEqual(["awaiting-llm", "validating", "repairing"]);
    expect(agents.at(-1)?.phase).toBe("repairing");
    expect(agents.at(-1)?.repairUsed).toBe(true);
  });

  test("repair transport fail keeps first validation details and never sets rateLimit", async () => {
    let n = 0;
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        n += 1;
        if (n === 1) return Promise.resolve(okGenerate(envelope(invalidFieldSpec)));
        return Promise.resolve(failGenerate("rate_limited", "slow repair", 30));
      },
    });
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") return;
    expect(outcome.rateLimit).toBeUndefined();
    const failure = agents.at(-1)?.failure;
    expect(failure?.code).toBe("rate_limited");
    expect(failure?.details?.length).toBeGreaterThan(0);
  });

  test("repair still invalid → validation failure", async () => {
    let n = 0;
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        n += 1;
        return Promise.resolve(okGenerate(envelope(invalidFieldSpec)));
      },
    });
    expect(outcome.kind).toBe("failed");
    expect(n).toBe(2);
    expect(agents.at(-1)?.failure?.code).toBe("validation");
  });

  test("stale after first generate → stale (no fail)", async () => {
    let gate = false;
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput({ isStale: () => gate }), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        gate = true;
        return Promise.resolve(okGenerate(envelope(validSpec)));
      },
    });
    expect(outcome.kind).toBe("stale");
    expect(phasesOf(agents)).toEqual(["awaiting-llm"]);
  });

  test("stale after example delay → stale", async () => {
    let gate = false;
    const delays: number[] = [];
    const example: PlaygroundExamplePrompt = {
      id: "ex",
      label: "Ex",
      prompt: "show penguins",
      datasetId: "penguins",
      envelope: envelope(validSpec, "Example"),
    };
    const outcome = await runPlaygroundAgentRun(baseInput({ example, isStale: () => gate }), {
      onAgent: () => {},
      generateChart: () => {
        throw new Error("example path must not generate");
      },
      delay: (ms) => {
        delays.push(ms);
        gate = true;
      },
    });
    expect(outcome.kind).toBe("stale");
    expect(delays).toEqual([120]);
  });

  test("stale after repair generate → stale", async () => {
    let n = 0;
    let gate = false;
    const outcome = await runPlaygroundAgentRun(baseInput({ isStale: () => gate }), {
      onAgent: () => {},
      generateChart: () => {
        n += 1;
        if (n === 1) return Promise.resolve(okGenerate(envelope(invalidFieldSpec)));
        gate = true;
        return Promise.resolve(okGenerate(envelope(validSpec)));
      },
    });
    expect(outcome.kind).toBe("stale");
    expect(n).toBe(2);
  });

  test("stale after successful validate → stale (no ready_to_stage)", async () => {
    // Flip on the validating phase (after first-generate stale check, before
    // the post-validate gate) so validate still runs.
    let gate = false;
    const outcome = await runPlaygroundAgentRun(baseInput({ isStale: () => gate }), {
      onAgent: (a) => {
        if (a.phase === "validating") gate = true;
      },
      generateChart: () => Promise.resolve(okGenerate(envelope(validSpec))),
    });
    expect(outcome.kind).toBe("stale");
  });

  test("example path: delay once, zero generate, ready_to_stage", async () => {
    const agents: PlaygroundAgentState[] = [];
    const delays: number[] = [];
    let generates = 0;
    const example: PlaygroundExamplePrompt = {
      id: "ex",
      label: "Ex",
      prompt: "show penguins",
      datasetId: "penguins",
      envelope: envelope(validSpec, "Example"),
    };
    const outcome = await runPlaygroundAgentRun(baseInput({ example }), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        generates += 1;
        return Promise.resolve(okGenerate(envelope(validSpec)));
      },
      delay: (ms) => {
        delays.push(ms);
      },
      now: () => 42,
    });
    expect(outcome.kind).toBe("ready_to_stage");
    expect(generates).toBe(0);
    expect(delays).toEqual([120]);
    expect(agents[0]?.phaseLine).toContain("example");
    expect(agents[0]?.exampleMode).toBe(true);
    expect(phasesOf(agents)).toEqual(["awaiting-llm", "validating"]);
  });

  test("example path never enters repair even if envelope would be repairable", async () => {
    let generates = 0;
    const example: PlaygroundExamplePrompt = {
      id: "ex",
      label: "Ex",
      prompt: "bad",
      datasetId: "penguins",
      envelope: envelope(invalidFieldSpec),
    };
    const outcome = await runPlaygroundAgentRun(baseInput({ example }), {
      onAgent: () => {},
      generateChart: () => {
        generates += 1;
        return Promise.resolve(okGenerate(envelope(validSpec)));
      },
      delay: () => {},
    });
    expect(outcome.kind).toBe("failed");
    expect(generates).toBe(0);
  });

  test("thrown error maps to pipeline failure when not stale", async () => {
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        throw new Error("boom");
      },
    });
    expect(outcome.kind).toBe("failed");
    expect(agents.at(-1)?.failure?.code).toBe("pipeline");
    expect(agents.at(-1)?.failure?.message).toContain("boom");
  });

  test("thrown error while stale → stale", async () => {
    let gate = false;
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput({ isStale: () => gate }), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        gate = true;
        throw new Error("late");
      },
    });
    expect(outcome.kind).toBe("stale");
    // No failAgent after abort/supersede — only the initial awaiting phase.
    expect(phasesOf(agents)).toEqual(["awaiting-llm"]);
  });

  test("mock first generate then non-repairable fail preserves mockNotice", async () => {
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: () => {},
      generateChart: () => Promise.resolve(okGenerate(envelope(seedBoundSpec), "mock")),
    });
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") return;
    expect(outcome.mockNotice).toBe(true);
  });

  test("mock first generate success → ready_to_stage with mockNotice", async () => {
    const outcome = await runPlaygroundAgentRun(baseInput(), {
      onAgent: () => {},
      generateChart: () => Promise.resolve(okGenerate(envelope(validSpec, "Mock"), "mock")),
    });
    expect(outcome.kind).toBe("ready_to_stage");
    if (outcome.kind !== "ready_to_stage") return;
    expect(outcome.mockNotice).toBe(true);
  });

  test("signal is forwarded to first generate and repair", async () => {
    const controller = new AbortController();
    const seen: Array<AbortSignal | undefined> = [];
    let n = 0;
    await runPlaygroundAgentRun(baseInput({ signal: controller.signal }), {
      onAgent: () => {},
      generateChart: (_req, opts) => {
        seen.push(opts?.signal);
        n += 1;
        if (n === 1) return Promise.resolve(okGenerate(envelope(invalidFieldSpec)));
        return Promise.resolve(okGenerate(envelope(validSpec)));
      },
    });
    expect(seen).toEqual([controller.signal, controller.signal]);
  });

  test("abort/stale after generate does not failAgent (onCancel owns aborted)", async () => {
    let gate = false;
    const agents: PlaygroundAgentState[] = [];
    const outcome = await runPlaygroundAgentRun(baseInput({ isStale: () => gate }), {
      onAgent: (a) => {
        agents.push(a);
      },
      generateChart: () => {
        gate = true;
        // Client maps AbortError to { ok: false, code: "aborted" }; if we
        // did not check isStale first, this would failAgent and clobber
        // onCancel's aborted failure.
        return Promise.resolve(failGenerate("network", "aborted transport"));
      },
    });
    expect(outcome.kind).toBe("stale");
    expect(phasesOf(agents)).toEqual(["awaiting-llm"]);
    expect(agents.some((a) => a.phase === "failed")).toBe(false);
  });

  test("getCurrentSpec is called again on repair", async () => {
    const specs: unknown[] = [];
    let n = 0;
    let reads = 0;
    await runPlaygroundAgentRun(
      baseInput({
        getCurrentSpec: () => {
          reads += 1;
          const value = { read: reads };
          specs.push(value);
          return value;
        },
      }),
      {
        onAgent: () => {},
        generateChart: (req) => {
          n += 1;
          if (n === 1) {
            expect(req.currentSpec).toEqual({ read: 1 });
            return Promise.resolve(okGenerate(envelope(invalidFieldSpec)));
          }
          expect(req.currentSpec).toEqual({ read: 2 });
          return Promise.resolve(okGenerate(envelope(validSpec)));
        },
      },
    );
    expect(reads).toBe(2);
  });

  test("onAgent fires synchronously before first await (busy latch)", async () => {
    const phases: string[] = [];
    let sawAwaitingBeforeGenerate = false;
    await runPlaygroundAgentRun(baseInput(), {
      onAgent: (a) => {
        phases.push(a.phase);
      },
      generateChart: () => {
        sawAwaitingBeforeGenerate = phases[0] === "awaiting-llm";
        return Promise.resolve(okGenerate(envelope(validSpec)));
      },
    });
    expect(sawAwaitingBeforeGenerate).toBe(true);
  });
});
