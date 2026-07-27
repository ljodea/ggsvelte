import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import type { GenerateChartResult } from "../apps/docs/src/lib/playground-agent-client";
import {
  defaultPlaygroundInteractions,
  type PlaygroundAgentEnvelope,
} from "../apps/docs/src/lib/playground-agent-envelope";
import { encodePlaygroundSeed, type PlaygroundSeedV1 } from "../apps/docs/src/lib/playground-codec";
import { createPlaygroundSession } from "../apps/docs/src/lib/playground-session";

const baseSpec: PortableSpec = {
  edition: 2,
  data: {
    values: [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ],
  },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    },
  ],
  labs: { title: "Baseline" },
};

const sampleSeed = (id = "starter", title = "Baseline"): PlaygroundSeedV1 => ({
  version: 1,
  source: { kind: "sample", id },
  spec: { ...baseSpec, labs: { title } },
});

const catalog = [
  { id: "starter", seed: sampleSeed("starter", "Starter") },
  { id: "other", seed: sampleSeed("other", "Other") },
] as const;

const catalogs = {
  examples: [] as const,
  samples: [
    { id: "starter", fragment: "#play=v1.trusted-starter" },
    { id: "other", fragment: "#play=v1.trusted-other" },
  ],
};

const validSpec: PortableSpec = {
  edition: 2,
  data: { name: "penguins" },
  layers: [
    {
      geom: "point",
      aes: { x: { field: "flipper" }, y: { field: "mass" } },
    },
  ],
  labs: { title: "Generated" },
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

function deferredGenerate(): {
  promise: Promise<GenerateChartResult>;
  resolve: (result: GenerateChartResult) => void;
} {
  let resolve!: (result: GenerateChartResult) => void;
  const promise = new Promise<GenerateChartResult>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function candidateTitle(session: ReturnType<typeof createPlaygroundSession>): string | undefined {
  const labs = session.workbench.candidate?.next.seed.spec.labs;
  return labs === undefined || typeof labs === "string" ? undefined : labs.title;
}

describe("createPlaygroundSession run-token races", () => {
  test("agent run superseded by a second run must not stage the first result", async () => {
    const first = deferredGenerate();
    const second = deferredGenerate();
    let calls = 0;
    const session = createPlaygroundSession({
      initialSeed: sampleSeed(),
      samples: catalog,
      shareCatalogs: catalogs,
      generateChart: () => {
        calls += 1;
        return calls === 1 ? first.promise : second.promise;
      },
    });

    const run1 = session.runAgent("first prompt", "penguins");
    // Let beginAgentRequest land before the second run bumps the token.
    await Promise.resolve();
    expect(session.agent.phase).toBe("awaiting-llm");

    const run2 = session.runAgent("second prompt", "penguins");
    await Promise.resolve();
    expect(session.agent.phase).toBe("awaiting-llm");

    // Stale first completion must not stage.
    first.resolve(okGenerate(envelope({ ...validSpec, labs: { title: "First" } }, "First")));
    await run1;
    expect(candidateTitle(session)).toBeUndefined();
    expect(session.workbench.candidate).toBeNull();

    second.resolve(okGenerate(envelope({ ...validSpec, labs: { title: "Second" } }, "Second")));
    await run2;
    expect(candidateTitle(session)).toBe("Second");
    expect(session.agent.phase).toBe("drawing");
  });

  test("agent run superseded by a sample load must not stage after the load", async () => {
    const deferred = deferredGenerate();
    const session = createPlaygroundSession({
      initialSeed: sampleSeed(),
      samples: catalog,
      shareCatalogs: catalogs,
      generateChart: () => deferred.promise,
    });

    const run = session.runAgent("slow prompt", "penguins");
    await Promise.resolve();
    expect(session.agent.phase).toBe("awaiting-llm");

    expect(session.loadSample("other")).toBe(true);
    expect(session.workbench.candidate?.origin).toBe("source");
    expect(session.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "other",
    });
    expect(session.agent.phase).toBe("idle");

    deferred.resolve(okGenerate(envelope({ ...validSpec, labs: { title: "Late" } }, "Late")));
    await run;
    // Sample candidate must remain — the late agent result must not overwrite it.
    expect(session.workbench.candidate?.origin).toBe("source");
    expect(session.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "other",
    });
    expect(session.agent.phase).toBe("idle");
  });

  test("cancel mid-repair then undo restores prior chart without agent busy", async () => {
    let resolveRepair!: (result: GenerateChartResult) => void;
    let calls = 0;
    const session = createPlaygroundSession({
      initialSeed: sampleSeed("starter", "Starter"),
      samples: catalog,
      shareCatalogs: catalogs,
      generateChart: () => {
        calls += 1;
        if (calls === 1) {
          // Invalid field forces a repair round.
          return Promise.resolve(
            okGenerate(
              envelope({
                edition: 2,
                data: { name: "penguins" },
                layers: [
                  {
                    geom: "point",
                    aes: { x: { field: "nope" }, y: { field: "mass" } },
                  },
                ],
              }),
            ),
          );
        }
        return new Promise<GenerateChartResult>((r) => {
          resolveRepair = r;
        });
      },
    });

    // Build undo history: confirm the initial chart painted, then promote a sample.
    session.confirmRendered();
    expect(session.loadSample("other")).toBe(true);
    expect(session.promoteCandidate(session.workbench.candidate!.generation).accepted).toBe(true);
    expect(session.workbench.undoSnapshots.length).toBeGreaterThan(0);
    expect(session.workbench.seed.source).toEqual({ kind: "sample", id: "other" });

    const run = session.runAgent("repair me", "penguins");
    // Drain the generate→validate→repair microtask queue until repair is pending.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(2);
    expect(session.agent.phase).toBe("repairing");

    session.cancel();
    expect(session.agent.phase).toBe("failed");
    expect(session.agent.failure?.code).toBe("aborted");
    expect(session.busy).toBe(false);

    // Late repair must not resurrect the cancelled run.
    resolveRepair(okGenerate(envelope({ ...validSpec, labs: { title: "Repaired" } }, "Repaired")));
    await run;
    expect(session.workbench.candidate).toBeNull();
    expect(session.agent.phase).toBe("failed");

    expect(session.undo()).toBe(true);
    expect(session.busy).toBe(false);
    expect(session.agent.phase).toBe("failed"); // undo does not clear agent failure
    expect(session.workbench.candidate?.origin).toBe("undo");
    // Undo stages the prior snapshot (starter baseline before "other" promote).
    expect(session.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "starter",
    });
  });

  test("#play= restore while a run is in flight cancels the run and keeps restored seed", async () => {
    const deferred = deferredGenerate();
    const session = createPlaygroundSession({
      initialSeed: sampleSeed("starter", "Starter"),
      samples: catalog,
      shareCatalogs: {
        examples: [],
        samples: catalog.map((entry) => ({
          id: entry.id,
          fragment: encodePlaygroundSeed(entry.seed),
        })),
      },
      generateChart: () => deferred.promise,
    });

    const run = session.runAgent("in flight", "penguins");
    await Promise.resolve();
    expect(session.agent.phase).toBe("awaiting-llm");

    const hash = encodePlaygroundSeed(sampleSeed("other", "Other"));
    const side = session.restoreFromHash("popstate", hash);
    expect(side.kind).toBe("applied");
    expect(session.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "other",
    });
    // Busy agent must be reset so restore does not leave a drawing phase.
    expect(session.agent.phase).toBe("idle");
    expect(session.busy).toBe(false);

    deferred.resolve(okGenerate(envelope({ ...validSpec, labs: { title: "Late" } }, "Late")));
    await run;
    expect(session.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "other",
    });
    expect(session.agent.phase).toBe("idle");
  });
});
