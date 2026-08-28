import { describe, expect, it } from "bun:test";
import { read } from "./test-helpers";

describe("R0 release wiring — visual regression workflows", () => {
  it("uses bash for the containerized visual approval job", () => {
    const workflow = read(".github/workflows/vr-compare.yml");
    const approvalJob = workflow.slice(workflow.indexOf("  approve-regenerate:"));
    expect(approvalJob).toContain("defaults:");
    expect(approvalJob).toContain("shell: bash");
  });

  it("scopes approve-regenerate to smoke VR screenshots only (#421)", () => {
    // Full-suite --update-snapshots fails on non-snapshot assertion tests and
    // permanently blocks baseline landing when any journey is red (see #421).
    const workflow = read(".github/workflows/vr-compare.yml");
    const approvalJob = workflow.slice(workflow.indexOf("  approve-regenerate:"));
    const nextJob = approvalJob.search(/\n  [a-zA-Z0-9_-]+:/);
    const job = nextJob === -1 ? approvalJob : approvalJob.slice(0, nextJob);
    expect(job).toContain("bun run test:visual -- vr.spec.ts --workers=1 --update-snapshots");
    // Must not reintroduce the full-suite regenerate command.
    expect(job).not.toMatch(/bun run test:visual -- --workers=1 --update-snapshots/);
    // approve-regenerate checks out the *approved PR's merge SHA*, which may
    // still contain the pre-move non-pixel scroll test in vr.spec.ts. Invert
    // that title so legacy render trees cannot block baseline upload.
    expect(job).toContain("--grep-invert 'preserves real page scrolling'");
    // Smoke file on main must stay screenshot-only (Codex P2 on #531).
    const smokeSpec = read("tests/visual/vr.spec.ts");
    expect(smokeSpec).not.toContain("without a golden");
    expect(smokeSpec).not.toContain("preserves real page scrolling");
    const journeysSpec = read("tests/visual/interaction-accessibility.spec.ts");
    expect(journeysSpec).toContain("preserves real page scrolling");
  });
});
