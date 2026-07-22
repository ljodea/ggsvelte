import { describe, expect, it } from "vitest";

import {
  planLegendCommittedReconcile,
  planLegendFocusDisabledClear,
  planLegendRovingFocusSync,
} from "../../src/lib/legend/focus-plans.js";
import { buildInteractiveLegendEntries } from "../../src/lib/legend/focus.js";
import { discreteFill } from "./focus-fixtures.js";

describe("planLegendRovingFocusSync", () => {
  it("noops when the roving index is already clamped and nothing is focused", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 1,
        entryCount: 3,
        focusedIndex: null,
      }),
    ).toEqual({ type: "noop", nextIndex: 1 });
  });

  it("clamps roving without refocus when focus is outside the legend", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 9,
        entryCount: 3,
        focusedIndex: null,
      }),
    ).toEqual({ type: "clamp-roving", nextIndex: 2 });
  });

  it("clamps without refocus when the entry list is empty", () => {
    // count === 0 still clamps roving to 0, but skips DOM refocus even if
    // focusedIndex is set (host returns before the focus microtask).
    expect(
      planLegendRovingFocusSync({
        currentRoving: 2,
        entryCount: 0,
        focusedIndex: 1,
      }),
    ).toEqual({ type: "clamp-roving", nextIndex: 0 });
    expect(
      planLegendRovingFocusSync({
        currentRoving: 0,
        entryCount: 0,
        focusedIndex: 1,
      }),
    ).toEqual({ type: "noop", nextIndex: 0 });
  });

  it("refocuses the clamped focused index when a target is focused", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 0,
        entryCount: 3,
        focusedIndex: 5,
      }),
    ).toEqual({ type: "refocus", nextIndex: 0, returnIndex: 2 });
  });

  it("characterizes NaN focusedIndex as refocus entry 0 (dataset parse miss)", () => {
    // Host does Number(dataset.index); missing/non-numeric yields NaN, not null.
    expect(
      planLegendRovingFocusSync({
        currentRoving: 1,
        entryCount: 3,
        focusedIndex: Number.NaN,
      }),
    ).toEqual({ type: "refocus", nextIndex: 1, returnIndex: 0 });
  });

  it("refocuses and clamps roving together when both are out of range", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 8,
        entryCount: 2,
        focusedIndex: 1,
      }),
    ).toEqual({ type: "refocus", nextIndex: 1, returnIndex: 1 });
  });
});
describe("planLegendCommittedReconcile", () => {
  const entries = buildInteractiveLegendEntries([discreteFill]);
  const keyIndex = new Map<string, readonly PropertyKey[]>([
    ["fill:0", Object.freeze(["a", "c"])],
    ["fill:1", Object.freeze(["b"])],
  ]);

  it("noops when nothing is committed", () => {
    expect(
      planLegendCommittedReconcile({
        committed: null,
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 2,
      }),
    ).toEqual({ type: "noop" });
  });

  it("noops when live entry keys still match the commit", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["a", "c"] },
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 2,
      }),
    ).toEqual({ type: "noop" });
  });

  it("clears commit only on controller path when keys reshuffle", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
        entries,
        keyIndex,
        usesLocalEmphasis: false,
        localEmphasisCount: 0,
      }),
    ).toEqual({ type: "clear-committed" });
  });

  it("clears commit only when local emphasis is already empty", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 0,
      }),
    ).toEqual({ type: "clear-committed" });
  });

  it("clears commit and local-emits when local emphasis is active", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 2,
      }),
    ).toEqual({ type: "clear-committed-local-emit" });
  });

  it("treats a missing entry as key mismatch (empty keys)", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 9 }, keys: ["x"] },
        entries,
        keyIndex,
        usesLocalEmphasis: false,
        localEmphasisCount: 0,
      }),
    ).toEqual({ type: "clear-committed" });
  });
});

describe("planLegendFocusDisabledClear", () => {
  it("noops while legend focus remains enabled", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: true,
        hasPreview: true,
        hasCommitted: true,
        hasLocalEmphasis: true,
        usesLocalEmphasis: true,
      }),
    ).toEqual({ type: "noop" });
  });

  it("noops when focus is disabled but host legend state is already empty", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: false,
        hasPreview: false,
        hasCommitted: false,
        hasLocalEmphasis: false,
        usesLocalEmphasis: true,
      }),
    ).toEqual({ type: "noop" });
  });

  it("clears host state without local keys on the controller path", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: false,
        hasPreview: true,
        hasCommitted: false,
        hasLocalEmphasis: false,
        usesLocalEmphasis: false,
      }),
    ).toEqual({ type: "clear-host" });
  });

  it("clears host state and local emphasis when chart-local", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: false,
        hasPreview: false,
        hasCommitted: true,
        hasLocalEmphasis: true,
        usesLocalEmphasis: true,
      }),
    ).toEqual({ type: "clear-host-local" });
  });
});
