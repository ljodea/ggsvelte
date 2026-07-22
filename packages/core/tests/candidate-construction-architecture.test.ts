import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const pipelineDir = join(import.meta.dir, "../src/pipeline");
const constructionDir = join(pipelineDir, "candidate-construction");

/** Intentional candidate-construction modules (one primary concern each). */
const INTENTIONAL_MODULES = [
  "datum-values.ts",
  "datum.ts",
  "frame-row.ts",
  "identity-buckets.ts",
  "identity-index.ts",
  "represented-rows.ts",
].toSorted();

/** Ownership seams for the intentional module set. */
describe("Candidate construction architecture", () => {
  it("keeps Candidate construction behind one local module seam", () => {
    const legacySiblingModules = readdirSync(pipelineDir)
      .filter((name) => name.startsWith("build-candidates-") && name.endsWith(".ts"))
      .toSorted();

    expect(legacySiblingModules).toEqual([]);

    const implementationFiles = readdirSync(constructionDir)
      .filter((name) => name.endsWith(".ts"))
      .toSorted();

    expect(implementationFiles).toEqual(INTENTIONAL_MODULES);

    const outerModule = readFileSync(join(pipelineDir, "build-candidates.ts"), "utf8");
    const exportedFunctions = [...outerModule.matchAll(/^export function (\w+)/gm)].map(
      ([, name]) => name,
    );

    expect(exportedFunctions).toEqual(["buildPipelineCandidates"]);
  });

  it("keeps identity index free of filter/bucket bodies (ownership)", () => {
    const index = readFileSync(join(constructionDir, "identity-index.ts"), "utf8");
    const buckets = readFileSync(join(constructionDir, "identity-buckets.ts"), "utf8");
    const represented = readFileSync(join(constructionDir, "represented-rows.ts"), "utf8");
    // Index owns build + lazy get; filters/buckets live in dedicated modules.
    expect(index).not.toMatch(/^export function filter/m);
    expect(index).not.toMatch(/^export function buildBinLineageBuckets/m);
    expect(index).toMatch(/from "\.\/identity-buckets\.js"/);
    expect(buckets).toMatch(/^export function buildBinLineageBuckets/m);
    expect(represented).toMatch(/^export function filterRepresentedSourceRows/m);
  });

  it("keeps pure rank/logical helpers out of the identity resolver module", () => {
    const datum = readFileSync(join(constructionDir, "datum.ts"), "utf8");
    const values = readFileSync(join(constructionDir, "datum-values.ts"), "utf8");
    expect(values).toMatch(/^export function ordinalSeriesRank/m);
    expect(values).toMatch(/^export function resolveCandidateLogicalValues/m);
    expect(datum).toMatch(/from "\.\/datum-values\.js"/);
    expect(datum).not.toMatch(/^export function ordinalSeriesRank/m);
    expect(datum).not.toMatch(/^export function resolveCandidateLogicalValues/m);
  });
});
