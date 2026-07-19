import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const pipelineDir = join(import.meta.dir, "../src/pipeline");

describe("Candidate construction architecture", () => {
  it("keeps Candidate construction behind one local module seam", () => {
    const legacySiblingModules = readdirSync(pipelineDir)
      .filter((name) => name.startsWith("build-candidates-") && name.endsWith(".ts"))
      .toSorted();

    expect(legacySiblingModules).toEqual([]);

    const implementationFiles = readdirSync(join(pipelineDir, "candidate-construction"))
      .filter((name) => name.endsWith(".ts"))
      .toSorted();

    expect(implementationFiles.length).toBeLessThanOrEqual(3);

    const outerModule = readFileSync(join(pipelineDir, "build-candidates.ts"), "utf8");
    const exportedFunctions = [...outerModule.matchAll(/^export function (\w+)/gm)].map(
      ([, name]) => name,
    );

    expect(exportedFunctions).toEqual(["buildPipelineCandidates"]);
  });
});
