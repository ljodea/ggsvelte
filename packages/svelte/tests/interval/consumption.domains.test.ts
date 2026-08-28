import { describe, expect, it } from "vitest";

import {
  consumeIntervalKeys,
  sameIntervalRecord,
  type IntervalConsumptionCandidate,
} from "../../src/lib/interval/consumption.js";
import type { PlotInteractionInterval } from "../../src/lib/interaction/interaction.js";

import { panels, record } from "./consumption-fixtures.js";

describe("facet interval consumption", () => {
  it("intersects x and y domains naturally and returns empty when disjoint", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: {
        x: { kind: "time", domain: [Date.UTC(2025, 0, 2), Date.UTC(2025, 0, 3)] },
        y: { kind: "linear", domain: [10, 20] },
      },
      keys: [],
    };
    const timeCandidates = [
      {
        panelId: "north",
        xValue: new Date(Date.UTC(2025, 0, 2)),
        yValue: 30,
        keys: ["x-only"],
      },
      {
        panelId: "south",
        xValue: "2025-01-03",
        yValue: 5,
        keys: ["also-x-only"],
      },
    ];
    expect(consumeIntervalKeys({ records: [cross], panels, candidates: timeCandidates })).toEqual(
      [],
    );
  });

  it("uses positive numeric membership for transform:log10 domains", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "linear", transform: "log10", domain: [1, 100] } },
      keys: [],
    };
    expect(
      consumeIntervalKeys({
        records: [cross],
        panels,
        candidates: [
          { panelId: "north", xValue: -2, keys: ["negative"] },
          { panelId: "north", xValue: 10, keys: ["inside"] },
          { panelId: "south", xValue: 1000, keys: ["outside"] },
        ],
      }),
    ).toEqual(["inside"]);
  });

  it("rejects negative values on transform:log10 even when they fall inside the numeric domain range", () => {
    // A domain of [-50, 100] could only be authored directly on this pure
    // function (canonicalIntervalAxis forbids a non-positive log10 lower
    // bound at the controller boundary) — but the membership check itself
    // must reject by transform validity, not merely by domain range.
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "linear", transform: "log10", domain: [-50, 100] } },
      keys: [],
    };
    expect(
      consumeIntervalKeys({
        records: [cross],
        panels,
        candidates: [
          { panelId: "north", xValue: -2, keys: ["negative-in-range"] },
          { panelId: "north", xValue: 10, keys: ["inside"] },
        ],
      }),
    ).toEqual(["inside"]);
  });

  it("rejects negative values on transform:sqrt even when they fall inside the numeric domain range", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "linear", transform: "sqrt", domain: [-50, 100] } },
      keys: [],
    };
    expect(
      consumeIntervalKeys({
        records: [cross],
        panels,
        candidates: [
          { panelId: "north", xValue: -2, keys: ["negative-in-range"] },
          { panelId: "north", xValue: 0, keys: ["zero"] },
          { panelId: "north", xValue: 10, keys: ["inside"] },
        ],
      }),
    ).toEqual(["zero", "inside"]);
  });

  it("distinguishes same-domain axes by transform for equality", () => {
    const log10Record = record("north", "independent", ["n1"]);
    const withLog10Domain: PlotInteractionInterval<string> = {
      ...log10Record,
      domains: { x: { kind: "linear", transform: "log10", domain: [1, 5] } },
    };
    const withSqrtDomain: PlotInteractionInterval<string> = {
      ...log10Record,
      domains: { x: { kind: "linear", transform: "sqrt", domain: [1, 5] } },
    };
    const alsoLog10Domain: PlotInteractionInterval<string> = {
      ...log10Record,
      domains: { x: { kind: "linear", transform: "log10", domain: [1, 5] } },
    };
    // Same kind, same numeric domain, different transform — must not compare equal.
    expect(sameIntervalRecord(withLog10Domain, withSqrtDomain)).toBe(false);
    expect(sameIntervalRecord(withLog10Domain, alsoLog10Domain)).toBe(true);
  });

  it("matches band domains by canonical typed identity", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "band", values: ["@n:1"] } },
      keys: [],
    };
    expect(
      consumeIntervalKeys({
        records: [cross],
        panels,
        candidates: [
          { panelId: "north", xValue: 1, keys: ["number"] },
          { panelId: "north", xValue: "1", keys: ["string"] },
        ],
      }),
    ).toEqual(["number"]);
  });

  // Band membership is O(1) amortized via a Set built once per axis (not
  // includes() per candidate). This is a structural property of the
  // implementation; perf-regression coverage lives in the bench-smoke job,
  // not a wall-clock unit assertion (which flakes under CI contention).
  it("projects large band domains across many candidates without losing matches", () => {
    const selectedCount = 200;
    const candidateCount = 2_000;
    // Encoded band keys for numbers 0..selectedCount-1 (canonical @n: form).
    const values = Array.from({ length: selectedCount }, (_, i) => `@n:${i}`);
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "band", values } },
      keys: [],
    };
    const bandCandidates: IntervalConsumptionCandidate<string>[] = Array.from(
      { length: candidateCount },
      (_, i) => ({
        panelId: i % 2 === 0 ? "north" : "south",
        // Mix selected tail, unselected head, and typed string lookalikes.
        xValue: i < selectedCount ? i : i < selectedCount * 2 ? String(i % selectedCount) : i,
        keys: [`k${i}`],
      }),
    );
    const keys = consumeIntervalKeys({
      records: [cross],
      panels,
      candidates: bandCandidates,
    });
    // Only numeric values whose encodeKey is in the selected band set match.
    // Candidates with xValue in [0, selectedCount) match; string/"lookalike"
    // and out-of-band numbers do not.
    expect(keys).toHaveLength(selectedCount);
    expect(keys[0]).toBe("k0");
    expect(keys[selectedCount - 1]).toBe(`k${selectedCount - 1}`);
    expect(keys).not.toContain(`k${selectedCount}`);
  });

  it("treats records as the same across key order and controller canonicalization", () => {
    const committed = record("north", "independent", ["n4", "n1"]);
    const canonical: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "independent",
      domains: { x: { kind: "linear", domain: [1, 5] } },
      keys: ["n1", "n4"],
    };
    expect(sameIntervalRecord(committed, canonical)).toBe(true);
    expect(
      sameIntervalRecord(
        {
          ...committed,
          domains: {
            x: { kind: "band", values: ["@n:1", "1"] },
            y: { kind: "linear", transform: "log10", domain: [1, 100] },
          },
        },
        {
          ...canonical,
          domains: {
            x: { kind: "band", values: ["@n:1", "1"] },
            y: { kind: "linear", transform: "log10", domain: [1, 100] },
          },
        },
      ),
    ).toBe(true);
  });

  it("detects replaced records by panel, preset, domain, or key changes", () => {
    const committed = record("north", "independent", ["n1"]);
    expect(sameIntervalRecord(null, committed)).toBe(false);
    expect(sameIntervalRecord(committed, record("south", "independent", ["n1"]))).toBe(false);
    expect(sameIntervalRecord(committed, record("north", "union", ["n1"]))).toBe(false);
    expect(sameIntervalRecord(committed, record("north", "independent", ["n1", "n4"]))).toBe(false);
    expect(
      sameIntervalRecord(committed, {
        ...record("north", "independent", ["n1"]),
        domains: { x: { kind: "linear", domain: [1, 9] } },
      }),
    ).toBe(false);
    expect(
      sameIntervalRecord(committed, {
        ...record("north", "independent", ["n1"]),
        domains: {
          x: { kind: "linear", domain: [1, 5] },
          y: { kind: "band", values: ["low"] },
        },
      }),
    ).toBe(false);
    expect(
      sameIntervalRecord(
        {
          ...record("north", "independent", ["n1"]),
          domains: { x: { kind: "band", values: ["a", "b"] } },
        },
        {
          ...record("north", "independent", ["n1"]),
          domains: { x: { kind: "band", values: ["b", "a"] } },
        },
      ),
    ).toBe(false);
  });
});
