import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import { PlaygroundCodecError, type PlaygroundSeedV1 } from "../apps/docs/src/lib/playground-codec";
import {
  sharedLinkRejectDiagnostic,
  shouldClearPlayHashAfterPromotion,
  shouldConfirmDiscardForSampleLoad,
  shouldConfirmDiscardForUndo,
  verifiedSharedSeed,
} from "../apps/docs/src/lib/playground-link-policy";
import {
  createPlaygroundState,
  editPlaygroundDraft,
  stagePlaygroundDraft,
  type PlaygroundState,
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

const exampleSeed = (id = "area/basic"): PlaygroundSeedV1 => ({
  version: 1,
  source: { kind: "example", id },
  spec,
});

const catalogs = {
  examples: [
    {
      id: "area/basic",
      compatibility: { supported: true as const, fragment: "#play=v1.trusted-example" },
    },
    {
      id: "unsupported/chart",
      compatibility: { supported: false as const, reason: "too large" },
    },
  ],
  samples: [
    { id: "starter", fragment: "#play=v1.trusted-sample" },
    { id: "other", fragment: "#play=v1.other-sample" },
  ],
};

describe("verifiedSharedSeed", () => {
  test("keeps custom sources untouched", () => {
    const seed: PlaygroundSeedV1 = { version: 1, source: { kind: "custom" }, spec };
    expect(verifiedSharedSeed("#play=v1.anything", seed, catalogs)).toEqual(seed);
  });

  test("keeps trusted sample and example fragments", () => {
    expect(verifiedSharedSeed("#play=v1.trusted-sample", sampleSeed(), catalogs).source).toEqual({
      kind: "sample",
      id: "starter",
    });
    expect(verifiedSharedSeed("#play=v1.trusted-example", exampleSeed(), catalogs).source).toEqual({
      kind: "example",
      id: "area/basic",
    });
  });

  test("demotes untrusted sample, mismatched fragment, unknown id, and unsupported example", () => {
    expect(
      verifiedSharedSeed("#play=v1.other-sample", sampleSeed("starter"), catalogs).source,
    ).toEqual({ kind: "custom" });
    expect(
      verifiedSharedSeed("#play=v1.trusted-sample", sampleSeed("missing"), catalogs).source,
    ).toEqual({ kind: "custom" });
    expect(verifiedSharedSeed("#play=v1.wrong", exampleSeed(), catalogs).source).toEqual({
      kind: "custom",
    });
    expect(
      verifiedSharedSeed("#play=v1.x", exampleSeed("unsupported/chart"), catalogs).source,
    ).toEqual({ kind: "custom" });
  });
});

describe("sharedLinkRejectDiagnostic", () => {
  test("maps codec error to playground diagnostic with kebab code and fixed path/fix", () => {
    const error = new PlaygroundCodecError(
      "ENCODED_TOO_LARGE",
      "Shared playground payloads must be at most 16 KiB.",
    );
    expect(sharedLinkRejectDiagnostic(error)).toEqual({
      source: "playground",
      code: "encoded-too-large",
      path: "#play",
      message: "Shared playground payloads must be at most 16 KiB.",
      fix: "Open a generated example link or reset to a built-in sample.",
    });
  });
});

describe("discard confirm gates", () => {
  test("undo confirms only when draft is desynchronized", () => {
    const state = createPlaygroundState(sampleSeed());
    expect(shouldConfirmDiscardForUndo(state)).toBe(false);
    const edited = editPlaygroundDraft(state, state.draft + "\n");
    expect(shouldConfirmDiscardForUndo(edited)).toBe(true);
  });

  test("sample load confirms when desynchronized, pending candidate, or custom source", () => {
    const sampleState = createPlaygroundState(sampleSeed());
    expect(shouldConfirmDiscardForSampleLoad(sampleState)).toBe(false);

    const custom = createPlaygroundState({ version: 1, source: { kind: "custom" }, spec });
    expect(shouldConfirmDiscardForSampleLoad(custom)).toBe(true);

    const edited = editPlaygroundDraft(sampleState, sampleState.draft + "\n");
    expect(shouldConfirmDiscardForSampleLoad(edited)).toBe(true);

    const pending = stagePlaygroundDraft(
      editPlaygroundDraft(
        sampleState,
        JSON.stringify(
          {
            ...spec,
            labs: { title: "Next" },
          },
          null,
          2,
        ),
      ),
    );
    expect(pending.candidate).not.toBeNull();
    expect(shouldConfirmDiscardForSampleLoad(pending)).toBe(true);
  });
});

describe("shouldClearPlayHashAfterPromotion", () => {
  test("clears only apply/source/reset/undo origins when hash is a play fragment", () => {
    expect(shouldClearPlayHashAfterPromotion("apply", "#play=v1.abc")).toBe(true);
    expect(shouldClearPlayHashAfterPromotion("source", "#play=v1.abc")).toBe(true);
    expect(shouldClearPlayHashAfterPromotion("reset", "#play=v1.abc")).toBe(true);
    expect(shouldClearPlayHashAfterPromotion("undo", "#play=v1.abc")).toBe(true);
    expect(shouldClearPlayHashAfterPromotion("initial-navigation", "#play=v1.abc")).toBe(false);
    expect(shouldClearPlayHashAfterPromotion("popstate", "#play=v1.abc")).toBe(false);
    expect(shouldClearPlayHashAfterPromotion("apply", "#other")).toBe(false);
    expect(shouldClearPlayHashAfterPromotion("apply", "")).toBe(false);
  });
});

// Silence unused if tree-shaken fixtures stay for readability.
void (null as unknown as PlaygroundState);
