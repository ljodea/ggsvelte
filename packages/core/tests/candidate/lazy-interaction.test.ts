/**
 * Lazy interaction candidates (#1421).
 *
 * The lean render entry (`@ggsvelte/core/render`) must not carry the
 * candidate-store graph, and even the full entry must not BUILD the store
 * until something actually touches `model.candidates` / `model.lineage`
 * (headless SSR renders never hit-test).
 *
 * Candidate construction therefore runs through a runtime hook
 * (`candidate-runtime.ts`, mirroring `temporal-runtime.ts`): the full barrel
 * installs it via `install-candidates.ts`; the lean entry leaves it unset and
 * candidate access throws a plain Error naming the full entry.
 */
import { afterAll, describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";

import {
  getCandidateRuntime,
  installCandidateRuntime,
  resetCandidateRuntimeForTests,
} from "../../src/candidate-runtime.js";
import { installCandidates } from "../../src/install-candidates.js";
import { runPipeline } from "../../src/pipeline/run-pipeline.js";
import { renderToSVGString } from "../../src/render-svg.js";

const spec = gg({ x: [1, 2, 3, 4], y: [4, 3, 5, 2] }, aes({ x: "x", y: "y" }))
  .geomPoint()
  .spec();

const size = { width: 400, height: 300 };

/** Swap in a build-counting wrapper around the installed runtime. */
function countBuilds(): { builds: () => number } {
  const real = getCandidateRuntime();
  if (real === null) throw new Error("expected the full candidate runtime (test preload)");
  let builds = 0;
  installCandidateRuntime({
    build: (input) => {
      builds += 1;
      return real.build(input);
    },
  });
  return { builds: () => builds };
}

afterAll(() => {
  installCandidates();
});

describe("lazy interaction candidates", () => {
  it("builds zero stores during runPipeline; first .candidates access builds exactly one", () => {
    const counter = countBuilds();
    try {
      const model = runPipeline(spec, size);
      // The SSR/headless win: a pipeline run that never interacts builds nothing.
      expect(counter.builds()).toBe(0);

      const first = model.candidates;
      expect(counter.builds()).toBe(1);
      expect(first.size).toBeGreaterThan(0);

      // Memoized: repeat candidate + lineage access shares the one build.
      expect(model.candidates).toBe(first);
      void model.lineage;
      expect(counter.builds()).toBe(1);
    } finally {
      installCandidates();
    }
  });

  it(".lineage access alone triggers the shared build (no stale empty store)", () => {
    const counter = countBuilds();
    try {
      const model = runPipeline(spec, size);
      expect(counter.builds()).toBe(0);
      const lineage = model.lineage;
      expect(counter.builds()).toBe(1);
      // The build populated the store: every candidate lineage id resolves.
      const candidate = model.candidates.candidate(0);
      expect(candidate).not.toBeNull();
      expect(lineage.keys(candidate!.lineage).length).toBeGreaterThan(0);
    } finally {
      installCandidates();
    }
  });

  it("lean render path: no runtime → renderToSVGString works, candidate access throws", () => {
    resetCandidateRuntimeForTests();
    try {
      const svg = renderToSVGString(spec, size);
      expect(svg).toContain("<svg");

      const model = runPipeline(spec, size);
      expect(() => model.candidates).toThrowError(/@ggsvelte\/core/);
      expect(() => model.lineage).toThrowError(/@ggsvelte\/core/);
    } finally {
      installCandidates();
    }
  });

  it("dispose releases the retained build inputs (no eager build, no leak)", () => {
    const counter = countBuilds();
    try {
      const model = runPipeline(spec, size);
      expect(counter.builds()).toBe(0);
      model.dispose();
      // Never built: dispose dropped the retained inputs, so a late access is
      // a caller bug with a clear message — the build cannot resurrect them.
      expect(counter.builds()).toBe(0);
      expect(() => model.candidates).toThrowError(/dispose/);
    } finally {
      installCandidates();
    }
  });

  it("dispose after a build still returns the built store (pre-change semantics)", () => {
    const counter = countBuilds();
    try {
      const model = runPipeline(spec, size);
      const store = model.candidates;
      expect(counter.builds()).toBe(1);
      model.dispose();
      expect(model.candidates).toBe(store);
    } finally {
      installCandidates();
    }
  });
});
