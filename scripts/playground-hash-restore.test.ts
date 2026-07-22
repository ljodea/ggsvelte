import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  encodePlaygroundSeed,
  PlaygroundCodecError,
  type PlaygroundSeedV1,
} from "../apps/docs/src/lib/playground-codec";
import {
  applyPlaygroundHashRestoreState,
  rejectRestoreCancelPhase,
  resolvePlaygroundHashRestore,
} from "../apps/docs/src/lib/playground-hash-restore";
import {
  createPlaygroundState,
  stagePlaygroundDraft,
  editPlaygroundDraft,
} from "../apps/docs/src/lib/playground-state";

const spec: PortableSpec = {
  edition: 1,
  data: { values: [{ x: 1, y: 2 }] },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    },
  ],
};

const sampleSeed = (id = "starter"): PlaygroundSeedV1 => ({
  version: 1,
  source: { kind: "sample", id },
  spec,
});

const catalogs = {
  examples: [
    {
      id: "area/basic",
      compatibility: { supported: true as const, fragment: "#play=v1.trusted-example" },
    },
  ],
  samples: [
    { id: "starter", fragment: "#play=v1.trusted-sample" },
    { id: "other", fragment: "#play=v1.other-sample" },
  ],
};

const REJECT_STATUS =
  "The shared link was rejected. The current local chart and a truthful URL were retained.";

describe("resolvePlaygroundHashRestore", () => {
  test("absent hash is noop on initial navigation and stage-initial on popstate", () => {
    expect(resolvePlaygroundHashRestore("initial-navigation", "", catalogs)).toEqual({
      kind: "noop",
    });
    expect(resolvePlaygroundHashRestore("initial-navigation", "#", catalogs)).toEqual({
      kind: "noop",
    });
    expect(resolvePlaygroundHashRestore("popstate", "", catalogs)).toEqual({
      kind: "stage-initial",
    });
  });

  test("malformed hash rejects with diagnostic, exact status, and history-hash restore flag", () => {
    const decision = resolvePlaygroundHashRestore(
      "initial-navigation",
      "#play=not-valid",
      catalogs,
    );
    expect(decision.kind).toBe("reject");
    if (decision.kind !== "reject") return;
    expect(decision.replaceWithHistoryHash).toBe(true);
    expect(decision.statusMessage).toBe(REJECT_STATUS);
    expect(decision.diagnostic).toMatchObject({
      source: "playground",
      path: "#play",
      fix: "Open a generated example link or reset to a built-in sample.",
    });
    expect(decision.diagnostic.code).toMatch(/^[a-z0-9-]+$/);
  });

  test("valid hash stages verified seed and keeps fragment as historyHash", () => {
    const seed = sampleSeed();
    const hash = encodePlaygroundSeed(seed);
    // Force trusted fragment alignment for catalogs used above
    const trustedHash = catalogs.samples[0]!.fragment;
    // encode produces real payload; trust demotion uses exact fragment match
    const decision = resolvePlaygroundHashRestore("popstate", hash, {
      ...catalogs,
      samples: [{ id: "starter", fragment: hash }],
    });
    expect(decision.kind).toBe("stage");
    if (decision.kind !== "stage") return;
    expect(decision.historyHash).toBe(hash);
    expect(decision.seed.source).toEqual({ kind: "sample", id: "starter" });
    void trustedHash;
  });

  test("untrusted sample attribution is demoted to custom on stage path", () => {
    const seed = sampleSeed("starter");
    const hash = encodePlaygroundSeed(seed);
    const decision = resolvePlaygroundHashRestore("initial-navigation", hash, catalogs);
    expect(decision.kind).toBe("stage");
    if (decision.kind !== "stage") return;
    // catalogs.samples[0].fragment is not this hash → demote
    expect(decision.seed.source).toEqual({ kind: "custom" });
  });
});

describe("applyPlaygroundHashRestoreState", () => {
  test("noop returns the same state reference", () => {
    const state = createPlaygroundState(sampleSeed());
    expect(
      applyPlaygroundHashRestoreState(state, { kind: "noop" }, "initial-navigation", sampleSeed()),
    ).toBe(state);
  });

  test("stage-initial stages the provided initial seed with origin and null target hash", () => {
    const state = createPlaygroundState(sampleSeed("other"));
    const next = applyPlaygroundHashRestoreState(
      state,
      { kind: "stage-initial" },
      "popstate",
      sampleSeed("starter"),
    );
    expect(next.candidate).not.toBeNull();
    expect(next.candidate?.origin).toBe("popstate");
    expect(next.candidate?.next.seed.source).toEqual({ kind: "sample", id: "starter" });
    expect(next.candidate?.next.historyHash).toBeNull();
  });

  test("reject reports diagnostic and exact status without clearing historyHash field on state", () => {
    const state = createPlaygroundState(sampleSeed(), "#play=v1.prior");
    const diagnostic = {
      source: "playground" as const,
      code: "invalid-base64url",
      path: "#play",
      message: "bad",
      fix: "Open a generated example link or reset to a built-in sample.",
    };
    const next = applyPlaygroundHashRestoreState(
      state,
      {
        kind: "reject",
        diagnostic,
        statusMessage: REJECT_STATUS,
        replaceWithHistoryHash: true,
      },
      "popstate",
      sampleSeed(),
    );
    expect(next.diagnostics).toEqual([diagnostic]);
    expect(next.status).toBe(REJECT_STATUS);
    expect(next.historyHash).toBe("#play=v1.prior");
    expect(next.candidate).toBeNull();
  });

  test("stage stages trusted seed under the given origin and historyHash", () => {
    const state = createPlaygroundState(sampleSeed("other"));
    const seed = sampleSeed("starter");
    const next = applyPlaygroundHashRestoreState(
      state,
      { kind: "stage", seed, historyHash: "#play=v1.trusted-sample" },
      "initial-navigation",
      sampleSeed(),
    );
    expect(next.candidate?.origin).toBe("initial-navigation");
    expect(next.candidate?.next.historyHash).toBe("#play=v1.trusted-sample");
    expect(next.candidate?.next.seed.source).toEqual({ kind: "sample", id: "starter" });
  });
});

describe("rejectRestoreCancelPhase", () => {
  test("returns null when there was no prior candidate", () => {
    expect(rejectRestoreCancelPhase(null, REJECT_STATUS)).toBeNull();
  });

  test("returns cancelled phase using post-report status", () => {
    const previous = { generation: 3, origin: "apply" as const };
    expect(rejectRestoreCancelPhase(previous, REJECT_STATUS)).toEqual({
      generation: 3,
      origin: "apply",
      phase: "cancelled",
      status: REJECT_STATUS,
    });
  });

  test("status must be read after report — pre-report status would be wrong", () => {
    const state = createPlaygroundState(sampleSeed());
    const pending = stagePlaygroundDraft(
      editPlaygroundDraft(state, JSON.stringify({ ...spec, labs: { title: "Next" } }, null, 2)),
    );
    expect(pending.candidate).not.toBeNull();
    const previous = {
      generation: pending.candidate!.generation,
      origin: pending.candidate!.origin,
    };
    const rejected = applyPlaygroundHashRestoreState(
      pending,
      {
        kind: "reject",
        diagnostic: {
          source: "playground",
          code: "invalid-json",
          path: "#play",
          message: "bad",
          fix: "Open a generated example link or reset to a built-in sample.",
        },
        statusMessage: REJECT_STATUS,
        replaceWithHistoryHash: true,
      },
      "popstate",
      sampleSeed(),
    );
    expect(rejectRestoreCancelPhase(previous, pending.status)?.status).not.toBe(REJECT_STATUS);
    expect(rejectRestoreCancelPhase(previous, rejected.status)).toEqual({
      generation: previous.generation,
      origin: previous.origin,
      phase: "cancelled",
      status: REJECT_STATUS,
    });
  });
});

// Ensure codec error path still flows through resolve (not only synthetic rejects).
test("resolve reject uses sharedLinkRejectDiagnostic mapping for codec errors", () => {
  const decision = resolvePlaygroundHashRestore("popstate", "#play=v1.!!!", catalogs);
  expect(decision.kind).toBe("reject");
  if (decision.kind !== "reject") return;
  // Code is kebab form of a PlaygroundCodecErrorCode
  expect(decision.diagnostic.source).toBe("playground");
  expect(decision.diagnostic.path).toBe("#play");
  void PlaygroundCodecError;
});
