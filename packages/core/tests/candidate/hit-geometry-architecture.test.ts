import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const srcDir = join(import.meta.dir, "../../src");

describe("Candidate hit-geometry architecture", () => {
  it("keeps one mark hit-geometry table and a named topmost-hit policy", () => {
    const geometry = readFileSync(join(srcDir, "candidate-hit-geometry.ts"), "utf8");
    const resolve = readFileSync(join(srcDir, "candidate-hit-resolve.ts"), "utf8");
    const refine = readFileSync(join(srcDir, "candidate-store-spatial-refine.ts"), "utf8");
    const build = readFileSync(join(srcDir, "candidate-store-build.ts"), "utf8");
    const facade = readFileSync(join(srcDir, "candidate-store.ts"), "utf8");

    expect(geometry).toMatch(/const MARK_HIT_GEOMETRY/);
    expect(geometry).toMatch(/export function createHitGeometry/);
    expect(resolve).toMatch(/export function resolveTopmostHit/);
    // Refine is a thin adapter over the table — no kind-switches of its own.
    expect(refine).not.toMatch(/batch\.kind ===/);
    expect(refine).toMatch(/from "\.\/candidate-hit-geometry\.js"/);
    expect(build).toMatch(/from "\.\/candidate-hit-resolve\.js"/);
    expect(build).toMatch(/export function assembleCandidateStore/);
    // Deferred shell lives in the public facade — no phantom lazy/eager variants.
    expect(facade).toMatch(/export function buildCandidateStore/);
    expect(facade).toMatch(/assembleCandidateStore/);
    const phantom = readdirSync(srcDir).filter(
      (name) =>
        name === "candidate-store-lazy.ts" ||
        name === "candidate-store-eager.ts" ||
        name.startsWith("candidate-store-lazy") ||
        name.startsWith("candidate-store-eager"),
    );
    expect(phantom).toEqual([]);
  });
});
