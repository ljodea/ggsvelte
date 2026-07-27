import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import type { PlaygroundSeedV1 } from "../apps/docs/src/lib/playground-codec";
import { defaultPlaygroundInteractions } from "../apps/docs/src/lib/playground-agent-envelope";
import { planSampleLoad, planUndoChart } from "../apps/docs/src/lib/playground-workbench-actions";
import {
  confirmPlaygroundRendered,
  createPlaygroundState,
  editPlaygroundDraft,
  promotePlaygroundCandidate,
  stagePlaygroundSeed,
} from "../apps/docs/src/lib/playground-state";

const baseSpec: PortableSpec = {
  edition: 1,
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

const sampleSeed = (id = "starter"): PlaygroundSeedV1 => ({
  version: 1,
  source: { kind: "sample", id },
  spec: baseSpec,
});

const otherSeed: PlaygroundSeedV1 = {
  version: 1,
  source: { kind: "sample", id: "other" },
  spec: { ...baseSpec, labs: { title: "Other" } },
};

const catalog = [
  { id: "starter", seed: sampleSeed("starter") },
  { id: "other", seed: otherSeed },
] as const;

describe("planSampleLoad", () => {
  test("empty id is a noop", () => {
    const workbench = createPlaygroundState(sampleSeed());
    expect(planSampleLoad(workbench, "", catalog, false)).toEqual({ kind: "noop" });
  });

  test("unknown sample id is a noop", () => {
    const workbench = createPlaygroundState(sampleSeed());
    expect(planSampleLoad(workbench, "missing", catalog, false)).toEqual({ kind: "noop" });
  });

  test("known sample without confirm stages source candidate and resets session fields", () => {
    const workbench = createPlaygroundState(sampleSeed());
    const plan = planSampleLoad(workbench, "other", catalog, false);
    expect(plan.kind).toBe("load");
    if (plan.kind !== "load") return;

    expect(plan.previous).toBeNull();
    expect(plan.workbench.candidate?.origin).toBe("source");
    expect(plan.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "other",
    });
    expect(plan.interactions).toEqual(defaultPlaygroundInteractions());
    expect(plan.pendingInteractions).toBeNull();
    expect(plan.pendingSuccess).toBeNull();
    expect(plan.mockNotice).toBe(false);
    expect(plan.agent.phase).toBe("idle");
  });

  test("custom chart requires confirm before load; confirmed applies", () => {
    const custom = createPlaygroundState({
      version: 1,
      source: { kind: "custom" },
      spec: baseSpec,
    });
    expect(planSampleLoad(custom, "starter", catalog, false)).toEqual({
      kind: "needs_confirm",
    });

    const plan = planSampleLoad(custom, "starter", catalog, true);
    expect(plan.kind).toBe("load");
    if (plan.kind !== "load") return;
    expect(plan.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "starter",
    });
  });

  test("confirm gate runs before catalog lookup (unknown id still needs confirm)", () => {
    const custom = createPlaygroundState({
      version: 1,
      source: { kind: "custom" },
      spec: baseSpec,
    });
    expect(planSampleLoad(custom, "missing", catalog, false)).toEqual({
      kind: "needs_confirm",
    });
    expect(planSampleLoad(custom, "missing", catalog, true)).toEqual({
      kind: "noop",
    });
  });

  test("in-flight candidate requires confirm and previous ref points at cancelled generation", () => {
    const staged = stagePlaygroundSeed(createPlaygroundState(sampleSeed()), otherSeed, "agent");
    expect(staged.candidate).not.toBeNull();
    const generation = staged.candidate!.generation;

    const blocked = planSampleLoad(staged, "starter", catalog, false);
    expect(blocked.kind).toBe("needs_confirm");

    const plan = planSampleLoad(staged, "starter", catalog, true);
    expect(plan.kind).toBe("load");
    if (plan.kind !== "load") return;
    expect(plan.previous).toEqual({ generation, origin: "agent" });
    expect(plan.workbench.candidate?.generation).not.toBe(generation);
    expect(plan.workbench.candidate?.origin).toBe("source");
  });
});

describe("planUndoChart", () => {
  function workbenchWithUndo(): ReturnType<typeof createPlaygroundState> {
    const initial = createPlaygroundState(sampleSeed());
    const confirmed = confirmPlaygroundRendered(initial);
    const staged = stagePlaygroundSeed(confirmed, otherSeed, "agent");
    return promotePlaygroundCandidate(staged, staged.candidate!.generation);
  }

  test("noop when there are no undo snapshots", () => {
    const workbench = createPlaygroundState(sampleSeed());
    expect(planUndoChart(workbench, false, false)).toEqual({ kind: "noop" });
  });

  test("noop while a candidate is in flight", () => {
    const withUndo = workbenchWithUndo();
    const staged = stagePlaygroundSeed(withUndo, sampleSeed("starter"), "agent");
    expect(staged.candidate).not.toBeNull();
    expect(planUndoChart(staged, false, false)).toEqual({ kind: "noop" });
  });

  test("noop while agent is busy", () => {
    const withUndo = workbenchWithUndo();
    expect(planUndoChart(withUndo, true, false)).toEqual({ kind: "noop" });
  });

  test("desynced draft needs confirm; confirmed stages undo", () => {
    const withUndo = workbenchWithUndo();
    const desynced = editPlaygroundDraft(withUndo, withUndo.draft + "\n");
    expect(planUndoChart(desynced, false, false)).toEqual({ kind: "needs_confirm" });

    const plan = planUndoChart(desynced, false, true);
    expect(plan.kind).toBe("stage");
    if (plan.kind !== "stage") return;
    expect(plan.previous).toBeNull();
    expect(plan.workbench.candidate?.origin).toBe("undo");
    expect(plan.workbench.candidate?.next.seed.source).toEqual({
      kind: "sample",
      id: "starter",
    });
  });

  test("synchronized chart with undo history stages without confirm", () => {
    const withUndo = workbenchWithUndo();
    const plan = planUndoChart(withUndo, false, false);
    expect(plan.kind).toBe("stage");
    if (plan.kind !== "stage") return;
    expect(plan.workbench.candidate?.origin).toBe("undo");
  });

  test("confirmed re-call is still noop when undo stack is empty or busy", () => {
    const empty = createPlaygroundState(sampleSeed());
    expect(planUndoChart(empty, false, true)).toEqual({ kind: "noop" });

    const withUndo = workbenchWithUndo();
    expect(planUndoChart(withUndo, true, true)).toEqual({ kind: "noop" });

    const candidateInFlight = stagePlaygroundSeed(withUndo, sampleSeed("starter"), "agent");
    expect(planUndoChart(candidateInFlight, false, true)).toEqual({ kind: "noop" });
  });

  test("plans do not mutate the input workbench", () => {
    const custom = createPlaygroundState({
      version: 1,
      source: { kind: "custom" },
      spec: baseSpec,
    });
    const before = structuredClone(custom);
    planSampleLoad(custom, "starter", catalog, true);
    expect(custom).toEqual(before);

    const withUndo = workbenchWithUndo();
    const undoBefore = structuredClone(withUndo);
    planUndoChart(withUndo, false, false);
    expect(withUndo).toEqual(undoBefore);
  });
});
