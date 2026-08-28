/**
 * Unit tests for pure semantic-key helpers (source identity, epoch tokens).
 */
import { describe, expect, it, vi } from "vitest";

import {
  dataContentOrderToken,
  dataIdentityEpochToken,
} from "../../src/lib/runtime/semantic-data-identity.js";
import { createSourceIdentityTracker } from "../../src/lib/runtime/semantic-source-identity.js";

// ---------------------------------------------------------------------------
// Pure helpers (from plot-semantic-keys.test.ts)
// ---------------------------------------------------------------------------

describe("dataIdentityEpochToken", () => {
  it("returns no-data when not ready", () => {
    const tracker = createSourceIdentityTracker();
    expect(
      dataIdentityEpochToken({
        ready: false,
        dataToken: "1",
        specToken: "2",
        data: null,
        datasets: null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
      }),
    ).toBe("no-data");
  });

  it("joins prop tokens with O(R) row-reference order, not deep JSON of cells", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const rowA = { a: 1 };
    const rowB = { a: 2 };
    const data = [rowA, rowB];
    const first = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data,
      datasets: null,
      sourceIdentity: id,
    });
    // Same row references / order → same epoch (theme-style respecs keep prop identity).
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data,
        datasets: null,
        sourceIdentity: id,
      }),
    ).toBe(first);
    // In-place reverse of the same row objects bumps the order fingerprint.
    data.reverse();
    const reversed = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data,
      datasets: null,
      sourceIdentity: id,
    });
    expect(reversed).not.toBe(first);
    // Deep cell edits on the same row objects do not walk cells — token stays put.
    rowA.a = 99;
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data,
        datasets: null,
        sourceIdentity: id,
      }),
    ).toBe(reversed);
    // New dataToken (new prop reference) changes the epoch even with empty content.
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d2",
        specToken: "s",
        data: null,
        datasets: null,
        sourceIdentity: id,
      }),
    ).not.toBe(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data: null,
        datasets: null,
        sourceIdentity: id,
      }),
    );
  });

  it("fingerprints column-array identities (not only the columns wrapper)", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const x = [1, 2];
    const y = [3, 4];
    const columns = { x, y };
    const bare = dataContentOrderToken(columns, id);
    const wrapped = dataContentOrderToken({ columns }, id);
    // Both forms include each column array's identity (Codex P2).
    expect(bare).toContain(id(x));
    expect(bare).toContain(id(y));
    expect(wrapped).toContain(id(x));
    expect(wrapped).toContain(id(y));
    // Replace one column array on the map → content token changes.
    columns.y = [5, 6];
    expect(dataContentOrderToken(columns, id)).not.toBe(bare);
  });

  it("does not treat a multi-field map with a values column as a DataRef", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const values = [1, 2];
    const y = [3, 4];
    const bare = { values, y };
    const first = dataContentOrderToken(bare, id);
    expect(first.startsWith("c:")).toBe(true);
    expect(first).toContain(id(values));
    expect(first).toContain(id(y));
    bare.y = [9, 9];
    expect(dataContentOrderToken(bare, id)).not.toBe(first);
  });

  it("does not deep-serialize large row payloads (no JSON.stringify of cells)", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const largeRows = Array.from({ length: 2000 }, (_, i) => ({ i, pad: "x".repeat(64) }));
    const spy = vi.spyOn(JSON, "stringify");
    const token = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data: largeRows,
      datasets: null,
      sourceIdentity: id,
    });
    expect(token.startsWith("d:s:")).toBe(true);
    // Content order is O(R) row refs — same helper used standalone.
    expect(dataContentOrderToken(largeRows, id).startsWith("v:2000:")).toBe(true);
    // May stringify nothing, or only incidental non-data uses — never the full row array.
    for (const call of spy.mock.calls) {
      expect(call[0]).not.toBe(largeRows);
      if (Array.isArray(call[0])) {
        expect(call[0]).not.toContain(largeRows[0]);
      }
    }
    spy.mockRestore();
  });

  // #609 — geom-child layer data must participate in the identity epoch.
  it("includes layer-local data in the epoch when plot data/spec are absent", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const rowsA = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    const rowsB = [
      { x: 9, y: 8 },
      { x: 7, y: 6 },
    ];
    // Plot-level data/spec absent — tokens are stable literals.
    const absent = {
      ready: true as const,
      dataToken: "none",
      specToken: "none",
      data: null,
      datasets: null,
      sourceIdentity: id,
    };
    const withoutLayers = dataIdentityEpochToken(absent);
    const withLayerA = dataIdentityEpochToken({
      ...absent,
      layers: [{ data: rowsA }],
    });
    const withLayerB = dataIdentityEpochToken({
      ...absent,
      layers: [{ data: rowsB }],
    });
    expect(withLayerA).not.toBe(withoutLayers);
    expect(withLayerA).not.toBe(withLayerB);
    // Same layer data reference → stable epoch.
    expect(
      dataIdentityEpochToken({
        ...absent,
        layers: [{ data: rowsA }],
      }),
    ).toBe(withLayerA);
  });
});

describe("createSourceIdentityTracker", () => {
  it("assigns stable ids to the same object and distinct ids to different objects", () => {
    const tracker = createSourceIdentityTracker();
    const a = { v: 1 };
    const b = { v: 1 };
    expect(tracker.sourceIdentity(a)).toBe(tracker.sourceIdentity(a));
    expect(tracker.sourceIdentity(a)).not.toBe(tracker.sourceIdentity(b));
    expect(tracker.sourceIdentity(42)).toBe("42");
    expect(tracker.sourceIdentity(null)).toBe("null");
    expect(tracker.sourceIdentity("x")).toBe("x");
  });

  it("does not expose a clear operation (identity epochs must stay stable)", () => {
    const tracker = createSourceIdentityTracker();
    expect("clear" in tracker).toBe(false);
  });
});
