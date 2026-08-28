import { describe, expect, it } from "vitest";

import {
  recomputePanelIntervalFromLookup,
  recomputePanelIntervalProjection,
  type IntervalConsumptionCandidate,
  type PanelIntervalLookupCandidate,
} from "../../src/lib/interval/consumption.js";

import { candidates } from "./consumption-fixtures.js";

describe("facet interval consumption", () => {
  it("panel recompute rejects undefined axis values and keeps numeric axes", () => {
    // Membership is private to consume/recompute; assert via projection keys.
    const bandDomains = {
      x: { kind: "band" as const, values: ["low"] },
      y: { kind: "band" as const, values: ["low"] },
    };
    expect(
      recomputePanelIntervalProjection({
        panelId: "p",
        domains: bandDomains,
        candidates: [{ panelId: "p", xValue: undefined, yValue: "low", keys: ["a"] }],
      }).keys,
    ).toEqual([]);
    const numericDomains = {
      x: { kind: "linear" as const, domain: [1, 5] as const },
      y: { kind: "linear" as const, transform: "log10" as const, domain: [1, 100] as const },
    };
    expect(
      recomputePanelIntervalProjection({
        panelId: "p",
        domains: numericDomains,
        candidates: [{ panelId: "p", xValue: 3, yValue: 10, keys: ["ok"] }],
      }).keys,
    ).toEqual(["ok"]);
    expect(
      recomputePanelIntervalProjection({
        panelId: "p",
        domains: numericDomains,
        candidates: [{ panelId: "p", xValue: 3, yValue: -1, keys: ["bad"] }],
      }).keys,
    ).toEqual([]);
  });

  it("recomputes precise-bound keys in only the edited panel", () => {
    expect(
      recomputePanelIntervalProjection({
        panelId: "south",
        domains: {
          x: { kind: "linear", domain: [1, 3] },
          y: { kind: "band", values: ["low"] },
        },
        candidates,
      }).keys,
    ).toEqual(["s2", "shared"]);
  });

  it("recomputePanelIntervalProjection returns keys and lineageCount in one pass", () => {
    const projection = recomputePanelIntervalProjection({
      panelId: "south",
      domains: {
        x: { kind: "linear", domain: [1, 3] },
        y: { kind: "band", values: ["low"] },
      },
      candidates: [
        {
          panelId: "south",
          xValue: 2,
          yValue: "low",
          keys: ["s2", "shared"],
          sourceRows: [10, 11, 10],
        },
        {
          panelId: "south",
          xValue: 2,
          yValue: "low",
          keys: ["s3"],
          sourceRows: [11, 12],
        },
        {
          panelId: "north",
          xValue: 2,
          yValue: "low",
          keys: ["n1"],
          sourceRows: [99],
        },
      ],
    });
    expect(projection.keys).toEqual(["s2", "shared", "s3"]);
    // Unique source rows on south only: 10, 11, 12
    expect(projection.lineageCount).toBe(3);
  });

  it("recomputePanelIntervalProjection lineageCount is 0 when sourceRows omitted", () => {
    const projection = recomputePanelIntervalProjection({
      panelId: "south",
      domains: {
        x: { kind: "linear", domain: [1, 3] },
        y: { kind: "band", values: ["low"] },
      },
      candidates,
    });
    expect(projection.keys).toEqual(["s2", "shared"]);
    expect(projection.lineageCount).toBe(0);
  });

  it("recomputes panel keys against a large band domain via Set membership", () => {
    const selectedCount = 150;
    const values = Array.from({ length: selectedCount }, (_, i) => `@n:${i}`);
    // 500 south + 500 north. south xValue = i % 300, so matches are:
    // i=0..149 and i=300..449 (xValue in [0, 150)).
    const panelCandidates: IntervalConsumptionCandidate<string>[] = Array.from(
      { length: 1_000 },
      (_, i) => ({
        panelId: i < 500 ? "south" : "north",
        xValue: i % 300,
        keys: [`p${i}`],
      }),
    );
    const keys = recomputePanelIntervalProjection({
      panelId: "south",
      domains: { x: { kind: "band", values } },
      candidates: panelCandidates,
    }).keys;
    const expected = [
      ...Array.from({ length: 150 }, (_, i) => `p${i}`),
      ...Array.from({ length: 150 }, (_, i) => `p${300 + i}`),
    ];
    expect(keys).toEqual(expected);
  });

  it("recomputePanelIntervalFromLookup matches projection keys and unique lineage rows", () => {
    const store: Array<PanelIntervalLookupCandidate<string> | null> = [
      {
        panelId: "south",
        xValue: 2,
        yValue: "low",
        keys: ["s2", "shared"],
        lineage: 1,
        rowIndex: 10,
      },
      {
        panelId: "south",
        xValue: 2,
        yValue: "low",
        keys: ["s3"],
        lineage: 1,
        rowIndex: null,
      },
      {
        panelId: "south",
        xValue: 9,
        yValue: "low",
        keys: ["out"],
        lineage: 2,
        rowIndex: 50,
      },
      {
        panelId: "north",
        xValue: 2,
        yValue: "low",
        keys: ["n1"],
        lineage: 3,
        rowIndex: 99,
      },
      {
        panelId: "south",
        xValue: 2,
        yValue: "low",
        keys: ["extra-row"],
        lineage: 1,
        rowIndex: 12,
      },
    ];
    const lineages = new Map<number, readonly number[]>([
      [1, [10, 11]],
      [2, [50, 51]],
      [3, [99]],
    ]);
    const projection = recomputePanelIntervalFromLookup({
      panelId: "south",
      domains: {
        x: { kind: "linear", domain: [1, 3] },
        y: { kind: "band", values: ["low"] },
      },
      size: store.length,
      candidate: (id) => store[id] ?? null,
      lineageKeys: (lineageId) => lineages.get(lineageId) ?? [],
    });
    expect(projection.keys).toEqual(["s2", "shared", "s3", "extra-row"]);
    // Lineage 1 → 10,11; matching candidate also contributes rowIndex 12.
    expect(projection.lineageCount).toBe(3);
  });

  it("recomputePanelIntervalFromLookup expands each lineage once among matching candidates", () => {
    const sharedLineage = 7;
    const markCount = 80;
    const store: Array<PanelIntervalLookupCandidate<string> | null> = Array.from(
      { length: markCount + 2 },
      (_, i) => {
        if (i < markCount) {
          return {
            panelId: "south",
            xValue: 2,
            yValue: "low",
            keys: [`m${i}`],
            lineage: sharedLineage,
            rowIndex: null,
          };
        }
        if (i === markCount) {
          // In-panel but outside domain — must not expand lineage 99.
          return {
            panelId: "south",
            xValue: 99,
            yValue: "low",
            keys: ["outside"],
            lineage: 99,
            rowIndex: null,
          };
        }
        return {
          panelId: "north",
          xValue: 2,
          yValue: "low",
          keys: ["other-panel"],
          lineage: 100,
          rowIndex: null,
        };
      },
    );
    const lineageCalls = new Map<number, number>();
    const projection = recomputePanelIntervalFromLookup({
      panelId: "south",
      domains: {
        x: { kind: "linear", domain: [1, 3] },
        y: { kind: "band", values: ["low"] },
      },
      size: store.length,
      candidate: (id) => store[id] ?? null,
      lineageKeys: (lineageId) => {
        lineageCalls.set(lineageId, (lineageCalls.get(lineageId) ?? 0) + 1);
        return lineageId === sharedLineage ? [0, 1, 2, 3, 4] : [lineageId];
      },
    });
    expect(projection.keys).toHaveLength(markCount);
    expect(projection.lineageCount).toBe(5);
    expect(lineageCalls.get(sharedLineage)).toBe(1);
    expect(lineageCalls.has(99)).toBe(false);
    expect(lineageCalls.has(100)).toBe(false);
  });
});
