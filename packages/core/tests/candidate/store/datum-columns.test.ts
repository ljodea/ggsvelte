/**
 * Columnar datum seam (`CandidateStoreOptions.datumColumns`): a store built
 * from per-batch value columns must be observationally IDENTICAL to one built
 * from the per-candidate `datum` callback — same facts, same queries — while
 * never materializing a per-candidate object.
 *
 * The contract: `datumColumns` is consulted once per batch; a `null` return
 * declines the batch, which then falls back to the per-candidate callback.
 */
import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import type {
  CandidateBatchFacts,
  CandidateDatum,
  CandidateDatumColumns,
  CandidateFacts,
  CandidateStore,
} from "../../../src/candidate-store.ts";

import { data, scene } from "../fixtures.ts";

/** Reference resolver: today's per-candidate path over the shared fixture. */
function datumByFacts(): (facts: { batchIndex: number; primitiveIndex: number }) => CandidateDatum {
  return (facts) =>
    facts.batchIndex === 0
      ? (data[facts.primitiveIndex] ?? {})
      : (data[3 + facts.primitiveIndex] ?? {});
}

/** The same values, expressed as per-batch columns. */
function columnsByBatch(): (facts: CandidateBatchFacts) => CandidateDatumColumns | null {
  return (facts) => {
    const base = facts.batchIndex === 0 ? 0 : 3;
    const pick = (
      select: (datum: CandidateDatum) => unknown,
    ): readonly (CandidateDatum[keyof CandidateDatum] | null)[] =>
      Array.from(facts.primitiveIds, (id) => {
        const datum = data[base + id];
        const value = datum === undefined ? undefined : select(datum);
        return (value ?? null) as CandidateDatum[keyof CandidateDatum] | null;
      });
    return {
      xValue: pick((d) => d.xValue),
      yValue: pick((d) => d.yValue),
      sizeValue: null,
      linewidthValue: null,
      alphaValue: null,
      shapeValue: null,
      linetypeValue: null,
      seriesId: Uint32Array.from(facts.primitiveIds, (id) => data[base + id]?.seriesId ?? 0),
      seriesRank: Int32Array.from(facts.primitiveIds, (id) => data[base + id]?.seriesRank ?? -1),
      sourceOrder: null,
      lineage: null,
      autoMode: null,
    };
  };
}

function observe(store: CandidateStore): {
  facts: (CandidateFacts | null)[];
  hit: CandidateFacts | null;
  rect: Uint32Array;
  group: ReturnType<CandidateStore["group"]>;
} {
  const facts: (CandidateFacts | null)[] = [];
  for (let id = 0; id < store.size; id++) facts.push(store.candidate(id));
  const hit = store.hitTest(10, 20);
  const rect = store.queryRect(0, 0, 200, 120);
  const group = hit === null ? null : store.group(hit.id, "x");
  return { facts, hit, rect, group };
}

describe("candidate-store columnar datum seam", () => {
  it("produces facts and queries identical to the per-candidate path", () => {
    const byCallback = observe(buildCandidateStore(scene(), { datum: datumByFacts() }));
    const byColumns = observe(
      buildCandidateStore(scene(), { datum: datumByFacts(), datumColumns: columnsByBatch() }),
    );
    expect(byColumns.facts).toEqual(byCallback.facts);
    expect(byColumns.hit).toEqual(byCallback.hit);
    expect(byColumns.rect).toEqual(byCallback.rect);
    expect(byColumns.group).toEqual(byCallback.group);
  });

  it("never calls the per-candidate callback for batches with columns", () => {
    let callbackCalls = 0;
    const store = buildCandidateStore(scene(), {
      datum: (facts) => {
        callbackCalls++;
        return datumByFacts()(facts);
      },
      datumColumns: columnsByBatch(),
    });
    for (let id = 0; id < store.size; id++) store.candidate(id);
    expect(callbackCalls).toBe(0);
  });

  it("falls back to the per-candidate callback for declined batches", () => {
    const sceneTwoBatches = scene();
    const store = buildCandidateStore(sceneTwoBatches, {
      datum: datumByFacts(),
      datumColumns: (facts) => (facts.batchIndex === 0 ? null : columnsByBatch()(facts)),
    });
    const reference = buildCandidateStore(scene(), { datum: datumByFacts() });
    for (let id = 0; id < store.size; id++) {
      expect(store.candidate(id)).toEqual(reference.candidate(id));
    }
  });

  it("applies constants from style columns to every candidate", () => {
    const store = buildCandidateStore(scene(), {
      datumColumns: () => ({
        xValue: null,
        yValue: null,
        sizeValue: { kind: "constant", value: 4 },
        linewidthValue: null,
        alphaValue: null,
        shapeValue: null,
        linetypeValue: null,
        seriesId: null,
        seriesRank: null,
        sourceOrder: null,
        lineage: null,
        autoMode: null,
      }),
    });
    for (let id = 0; id < store.size; id++) {
      expect(store.candidate(id)?.sizeValue).toBe(4);
    }
  });
});
