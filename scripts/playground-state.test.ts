import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  PLAYGROUND_MAX_DECODED_BYTES,
  type PlaygroundSeedV1,
} from "../apps/docs/src/lib/playground-codec";
import {
  createPlaygroundState,
  editPlaygroundDraft,
  failPlaygroundCandidate,
  promotePlaygroundCandidate,
  resetPlaygroundSource,
  stagePlaygroundDraft,
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

const sampleSeed: PlaygroundSeedV1 = {
  version: 1,
  source: { kind: "sample", id: "starter" },
  spec: baseSpec,
};

const nextSpec: PortableSpec = {
  ...baseSpec,
  labs: { title: "Edited" },
};

describe("playground state", () => {
  test("edits only draft and invalid Apply retains the last rendered result", () => {
    const initial = createPlaygroundState(sampleSeed);
    const edited = editPlaygroundDraft(initial, '{"layers":[]}');
    expect(edited.committed).toEqual(baseSpec);
    expect(edited.rendered).toEqual(baseSpec);
    expect(edited.synchronized).toBe(false);

    const invalid = stagePlaygroundDraft(edited);
    expect(invalid.candidate).toBeNull();
    expect(invalid.committed).toEqual(baseSpec);
    expect(invalid.rendered).toEqual(baseSpec);
    expect(invalid.lastValid).toBe(true);
    expect(invalid.diagnostics[0]?.code).toBe("empty-layers");
    expect(invalid.canCopyOrShare).toBe(false);
  });

  test("keeps near-limit compact seeds editable without exceeding the pre-parse bound", () => {
    const nearLimitSpec: PortableSpec = {
      ...baseSpec,
      edition: 2,
      data: {
        values: Array.from({ length: 200 }, (_, index) => ({
          x: index,
          y: index + 1,
          label: `row-${String(index)}`,
        })),
      },
    };
    expect(
      new TextEncoder().encode(JSON.stringify(nearLimitSpec, null, 2)).byteLength,
    ).toBeGreaterThan(PLAYGROUND_MAX_DECODED_BYTES);
    expect(new TextEncoder().encode(JSON.stringify(nearLimitSpec)).byteLength).toBeLessThan(
      PLAYGROUND_MAX_DECODED_BYTES,
    );

    const state = createPlaygroundState({
      version: 1,
      source: { kind: "custom" },
      spec: nearLimitSpec,
    });
    expect(new TextEncoder().encode(state.draft).byteLength).toBeLessThanOrEqual(
      PLAYGROUND_MAX_DECODED_BYTES,
    );
    expect(stagePlaygroundDraft(state).candidate).not.toBeNull();
  });

  test("rejects oversized source before parsing and bounds valid-but-unshareable specs", () => {
    const oversizedSource = "{".repeat(PLAYGROUND_MAX_DECODED_BYTES + 1);
    const sourceRejected = stagePlaygroundDraft(
      editPlaygroundDraft(createPlaygroundState(sampleSeed), oversizedSource),
    );
    expect(sourceRejected.diagnostics[0]?.code).toBe("share-limit");
    expect(sourceRejected.diagnostics[0]?.message).toContain("12 KiB");

    const manyLayers = Array.from({ length: 130 }, () => baseSpec.layers[0]!);
    const oversizedSpec = JSON.stringify({ ...baseSpec, layers: manyLayers });
    expect(new TextEncoder().encode(oversizedSpec).byteLength).toBeGreaterThan(
      PLAYGROUND_MAX_DECODED_BYTES,
    );
    const specRejected = stagePlaygroundDraft(
      editPlaygroundDraft(createPlaygroundState(sampleSeed), oversizedSpec),
    );
    expect(specRejected.diagnostics[0]?.code).toBe("share-limit");
    expect(specRejected.candidate).toBeNull();
  });

  test("canonicalizes, stages, and promotes only a matching render generation", () => {
    const initial = createPlaygroundState(sampleSeed);
    const noncanonical = JSON.stringify({
      data: nextSpec.data,
      layers: [
        {
          geom: "point",
          aes: { x: { field: "x" }, y: { field: "y" } },
        },
      ],
      labs: nextSpec.labs,
    });
    const staged = stagePlaygroundDraft(editPlaygroundDraft(initial, noncanonical));
    expect(staged.candidate?.origin).toBe("apply");
    expect(staged.draft).toContain('"edition": 2');
    expect(staged.canCopyOrShare).toBe(false);
    expect(staged.committed).toEqual(baseSpec);

    expect(promotePlaygroundCandidate(staged, 999)).toEqual(staged);
    const promoted = promotePlaygroundCandidate(staged, staged.candidate!.generation);
    expect(promoted.candidate).toBeNull();
    expect(promoted.committed.labs?.title).toBe("Edited");
    expect(promoted.rendered).toEqual(promoted.committed);
    expect(promoted.seed.source).toEqual({ kind: "custom" });
    expect(promoted.synchronized).toBe(true);
    expect(promoted.canCopyOrShare).toBe(true);
  });

  test("pipeline failure keeps committed output and records last-valid state", () => {
    const staged = stagePlaygroundDraft(
      editPlaygroundDraft(createPlaygroundState(sampleSeed), JSON.stringify(nextSpec)),
    );
    const failed = failPlaygroundCandidate(staged, staged.candidate!.generation, {
      code: "palette-exhausted",
      path: "/scales/color",
      message: "The palette cannot represent this domain.",
      fix: "Choose a longer range.",
    });
    expect(failed.committed).toEqual(baseSpec);
    expect(failed.rendered).toEqual(baseSpec);
    expect(failed.draft).toContain("Edited");
    expect(failed.lastValid).toBe(true);
    expect(failed.canCopyOrShare).toBe(false);
    expect(failed.diagnostics[0]?.code).toBe("palette-exhausted");
  });

  test("source and navigation candidates leave the complete retained snapshot untouched until promotion", () => {
    const dirty = editPlaygroundDraft(createPlaygroundState(sampleSeed), "draft in progress");
    const navigationSeed: PlaygroundSeedV1 = {
      version: 1,
      source: { kind: "example", id: "point/scatter-color" },
      spec: nextSpec,
    };
    const staged = stagePlaygroundSeed(dirty, navigationSeed, "popstate");
    expect(staged.draft).toBe("draft in progress");
    expect(staged.sourceBaseline).toEqual(sampleSeed);
    expect(staged.candidate?.next.sourceBaseline).toEqual(navigationSeed);

    const failed = failPlaygroundCandidate(staged, staged.candidate!.generation, {
      code: "render-failed",
      path: "",
      message: "The shared chart could not render.",
    });
    expect(failed.draft).toBe("draft in progress");
    expect(failed.seed).toEqual(sampleSeed);
    expect(failed.sourceBaseline).toEqual(sampleSeed);
    expect(failed.navigationRecovery).toEqual({
      replaceHash: null,
      preserveForward: true,
    });

    const restaged = stagePlaygroundSeed(failed, navigationSeed, "popstate");
    const promoted = promotePlaygroundCandidate(restaged, restaged.candidate!.generation);
    expect(promoted.seed).toEqual(navigationSeed);
    expect(promoted.sourceBaseline).toEqual(navigationSeed);
    expect(promoted.draft).toContain("Edited");
  });

  test("reset stages the source baseline and never changes browser history itself", () => {
    const promotedEdit = promotePlaygroundCandidate(
      stagePlaygroundDraft(
        editPlaygroundDraft(createPlaygroundState(sampleSeed), JSON.stringify(nextSpec)),
      ),
      1,
    );
    const reset = resetPlaygroundSource(promotedEdit);
    expect(reset.candidate?.origin).toBe("source");
    expect(reset.historyIntent).toBe("none");
    const restored = promotePlaygroundCandidate(reset, reset.candidate!.generation);
    expect(restored.committed).toEqual(baseSpec);
    expect(restored.sourceBaseline).toEqual(sampleSeed);
  });
});
