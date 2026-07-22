import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import { data, scene, sceneWithPoints } from "../fixtures.ts";

describe("CandidateStore — lazy-lifecycle", () => {
  const store = buildCandidateStore(scene(), {
    epoch: 7,
    datum: ({ candidateIndex }) => data[candidateIndex]!,
  });

  it("defers semantic/index construction until interaction first reads the store", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(scene(), {
      datum: ({ candidateIndex }) => {
        resolutions++;
        return data[candidateIndex]!;
      },
    });
    expect(lazy.size).toBe(5);
    expect(resolutions).toBe(0);
    expect(lazy.candidate(0)?.id).toBe(0);
    expect(resolutions).toBe(5);
  });
  it("hit-tests points through the lazy store with tolerance and panel clipping", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(sceneWithPoints([[0, 20]]), {
      datum: () => {
        resolutions++;
        return {};
      },
    });
    expect(resolutions).toBe(0);
    expect(lazy.hitTest(5.5, 20)?.id).toBe(0);
    expect(resolutions).toBe(1);
    expect(lazy.hitTest(6.5, 20)).toBeNull();
    // The rendered mark is clipped at the panel edge even though its radius
    // extends around the point anchor.
    expect(lazy.hitTest(-1, 20)).toBeNull();

    const exactRadius = buildCandidateStore(sceneWithPoints([[10, 20]]), {
      hitTolerance: 0,
    });
    expect(exactRadius.hitTest(12.5, 20)?.id).toBe(0);
    expect(exactRadius.hitTest(13.5, 20)).toBeNull();
  });
  it("releases lazy resolvers and initialized candidate arrays on dispose", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(scene(), {
      datum: () => {
        resolutions++;
        return {};
      },
    });
    lazy.dispose();
    expect(lazy.size).toBe(0);
    expect(lazy.candidate(0)).toBeNull();
    expect(lazy.x).toHaveLength(0);
    expect(resolutions).toBe(0);

    const initialized = buildCandidateStore(scene());
    expect(initialized.candidate(0)).not.toBeNull();
    initialized.dispose();
    expect(initialized.size).toBe(0);
    expect(initialized.candidate(0)).toBeNull();
    expect(initialized.x).toHaveLength(0);
  });
  it("owns typed anchors and exposes stable candidate facts", () => {
    expect(store.x).toBeInstanceOf(Float32Array);
    expect(store.y).toBeInstanceOf(Float32Array);
    expect(store.size).toBe(5);
    expect(store.candidate(0)).toMatchObject({
      id: 0,
      epoch: 7,
      panelId: "panel:all",
      rowIndex: 0,
      seriesId: 0,
    });
  });
});
