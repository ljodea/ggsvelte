/**
 * Characterization + contract tests for CI composites.
 *
 * PR1 (step clusters): setup-bun / bun-install / download-packages-dist.
 * PR2 (job bodies): ci-job-* composites keep required check names while
 * moving step sequences out of ci.yml.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const SETUP_BUN = ".github/actions/ci-setup-bun/action.yml";
const BUN_INSTALL = ".github/actions/ci-bun-install/action.yml";
const DOWNLOAD_DIST = ".github/actions/ci-download-packages-dist/action.yml";

/** Jobs whose full step body lives in a local composite. */
const JOB_BODY_COMPOSITES = [
  "packages-dist",
  "checks",
  "unit",
  "compatibility-matrix",
  "consumer-compat",
  "component-svelte",
  "component-spikes",
  "component-journeys",
  "interaction-perf",
  "build",
  "svelte-check",
  "docs-site",
  "actions-security",
  "bench-smoke",
  "vr-baseline-guard",
  "ci-gate",
] as const;

/** Jobs that download the shared packages-dist artifact (inside job composites). */
const PACKAGES_DIST_CONSUMERS = [
  "consumer-compat",
  "component-svelte",
  "component-spikes",
  "component-journeys",
  "interaction-perf",
] as const;

const CONTAINER_BUN_INSTALL_JOBS = new Set([
  "component-svelte",
  "component-spikes",
  "component-journeys",
  "interaction-perf",
]);

const BUN_INSTALL_JOBS = [
  "packages-dist",
  "checks",
  "unit",
  "component-svelte",
  "component-spikes",
  "component-journeys",
  "interaction-perf",
  "build",
  "svelte-check",
  "docs-site",
  "actions-security",
  "bench-smoke",
] as const;

function jobSlice(ci: string, jobId: string): string {
  const start = ci.indexOf(`  ${jobId}:\n`);
  expect(start, `job ${jobId} missing`).toBeGreaterThan(-1);
  const rest = ci.slice(start + 1);
  const next = rest.search(/\n  [a-z0-9_-]+:\n/);
  return next === -1 ? ci.slice(start) : ci.slice(start, start + 1 + next);
}

function jobAction(jobId: string): string {
  return read(`.github/actions/ci-job-${jobId}/action.yml`);
}

/** Parse composite action.yml steps as line groups (for shell: contracts). */
function collectCompositeSteps(lines: string[]): string[][] {
  const stepsAt = lines.indexOf("  steps:");
  expect(stepsAt).toBeGreaterThan(-1);
  const steps: string[][] = [];
  let i = stepsAt + 1;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.startsWith("    - ")) {
      i += 1;
      continue;
    }
    const step: string[] = [line];
    i += 1;
    for (; i < lines.length; i += 1) {
      const next = lines[i] ?? "";
      if (next.startsWith("    - ") || (next !== "" && !next.startsWith("      "))) break;
      step.push(next);
    }
    steps.push(step);
  }
  return steps;
}

describe("ci-download-packages-dist composite", () => {
  it("exists with pinned download-artifact and three dist entrypoint checks", () => {
    expect(existsSync(join(root, DOWNLOAD_DIST))).toBe(true);
    const action = read(DOWNLOAD_DIST);
    expect(action).toContain("actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c");
    expect(action).toContain("name: packages-dist");
    expect(action).toContain("path: packages");
    expect(action).toContain("packages/spec/dist/index.js");
    expect(action).toContain("packages/core/dist/index.js");
    expect(action).toContain("packages/svelte/dist/index.js");
    expect(action).toContain("shell: bash");
  });

  it("is the sole packages-dist download path for the five consumer job bodies", () => {
    for (const jobId of PACKAGES_DIST_CONSUMERS) {
      const action = jobAction(jobId);
      expect(action, jobId).toContain("uses: ./.github/actions/ci-download-packages-dist");
      expect(action, jobId).not.toMatch(
        /download-artifact@[0-9a-f]+[\s\S]{0,120}name:\s*packages-dist/,
      );
    }
  });
});

describe("ci-setup-bun composite", () => {
  it("exists as setup-bun only (no checkout — local composites need prior checkout)", () => {
    expect(existsSync(join(root, SETUP_BUN))).toBe(true);
    const action = read(SETUP_BUN);
    expect(action).toContain("oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6");
    expect(action).toContain("bun-version:");
    expect(action).toContain("1.3.14");
    expect(action).not.toContain("actions/checkout@");
  });

  it("is used by detect-changes and every job-body composite that needs Bun", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(jobSlice(ci, "detect-changes")).toContain("uses: ./.github/actions/ci-setup-bun");
    expect(ci).not.toContain("oven-sh/setup-bun@");
    for (const jobId of JOB_BODY_COMPOSITES) {
      if (jobId === "compatibility-matrix") {
        // still needs bun for support-matrix.ts
      }
      const action = jobAction(jobId);
      expect(action, jobId).toContain("uses: ./.github/actions/ci-setup-bun");
      expect(action, jobId).not.toContain("oven-sh/setup-bun@");
    }
  });
});

describe("ci-bun-install composite", () => {
  it("exists with private runner.temp cache + frozen install", () => {
    expect(existsSync(join(root, BUN_INSTALL))).toBe(true);
    const action = read(BUN_INSTALL);
    expect(action).toContain("actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9");
    expect(action).toContain("path: ${{ runner.temp }}/bun-install-cache");
    expect(action).toContain("BUN_INSTALL_CACHE_DIR: ${{ runner.temp }}/bun-install-cache");
    expect(action).toContain("bun install --frozen-lockfile");
    expect(action).not.toContain("path: ~/.bun/install/cache");
    expect(action).toMatch(/cache_key_prefix|cache-key-prefix/);
  });

  it("wires host vs container cache prefixes inside job-body composites", () => {
    for (const jobId of BUN_INSTALL_JOBS) {
      const action = jobAction(jobId);
      expect(action, jobId).toContain("uses: ./.github/actions/ci-bun-install");
      if (CONTAINER_BUN_INSTALL_JOBS.has(jobId)) {
        expect(action, jobId).toMatch(/cache_key_prefix:\s*bun-container/);
      } else {
        expect(action, jobId).toMatch(/cache_key_prefix:\s*bun\b/);
      }
    }
    const consumer = jobAction("consumer-compat");
    expect(consumer).not.toContain("uses: ./.github/actions/ci-bun-install");
    expect(consumer).toContain("bun install --frozen-lockfile");
    expect(consumer).toContain("BUN_INSTALL_CACHE_DIR: ${{ runner.temp }}/bun-install-cache");
  });
});

describe("job-body composites keep required check names in ci.yml", () => {
  it("declares a thin wrapper job for each extracted body", () => {
    const ci = read(".github/workflows/ci.yml");
    for (const jobId of JOB_BODY_COMPOSITES) {
      const job = jobSlice(ci, jobId);
      expect(job, jobId).toContain(`uses: ./.github/actions/ci-job-${jobId}`);
      // Local composites require checkout before use (action tree on disk).
      expect(job, jobId).toContain("actions/checkout@");
      expect(jobAction(jobId), jobId).not.toContain("actions/checkout@");
      // Job topology stays in the workflow (not buried in the composite).
      expect(existsSync(join(root, `.github/actions/ci-job-${jobId}/action.yml`))).toBe(true);
    }
    // Detect-changes stays inlined as outputs + thin script call.
    expect(jobSlice(ci, "detect-changes")).toContain("scripts/ci-detect-changes.sh");
    expect(existsSync(join(root, "scripts/ci-detect-changes.sh"))).toBe(true);
    // Full-history checkouts stay on unit + VR guard wrappers.
    expect(jobSlice(ci, "unit")).toContain("fetch-depth: 0");
    expect(jobSlice(ci, "vr-baseline-guard")).toContain("fetch-depth: 0");
  });

  it("requires shell: bash on every composite run step", () => {
    for (const jobId of JOB_BODY_COMPOSITES) {
      for (const step of collectCompositeSteps(jobAction(jobId).split("\n"))) {
        const hasRun = step.some((l) => l.startsWith("      run:"));
        const hasShell = step.some((l) => l.startsWith("      shell:"));
        if (hasRun) {
          expect(hasShell, `${jobId}: ${step[0]}`).toBe(true);
        }
      }
    }
  });

  it("passes needs/vars/secrets into composites that need them", () => {
    const ci = read(".github/workflows/ci.yml");
    const unit = jobSlice(ci, "unit");
    expect(unit).toContain("codecov_token: ${{ secrets.CODECOV_TOKEN }}");
    expect(unit).toContain("bypass_content_cache:");
    expect(unit).toContain("disable_content_hash:");
    const consumer = jobSlice(ci, "consumer-compat");
    expect(consumer).toContain("matrix_node: ${{ matrix.node }}");
    expect(consumer).toContain("matrix_svelte: ${{ matrix.svelte }}");
    const gate = jobSlice(ci, "ci-gate");
    expect(gate).toContain("detect_result:");
    expect(gate).toContain("component_svelte_res:");
    expect(gate).toContain("vr_guard_res:");
  });

  it("keeps specialized packages-dist protocol and content-hash markers in job bodies", () => {
    const producer = jobAction("packages-dist");
    expect(producer).toContain("hash-inputs --execution packages_dist");
    expect(producer).toContain(".packages-dist-cache");
    expect(producer).toContain("steps.restore_dist.outputs.hit != 'true'");
    expect(producer).toContain("stage content-hash cache payload");
    expect(producer).not.toContain("ci-content-hash-restore");
    expect(producer).toContain("if-no-files-found: error");
    expect(producer).toContain("run: bun run build");

    const unit = jobAction("unit");
    expect(unit).toContain("uses: ./.github/actions/ci-content-hash-restore");
    expect(unit).toContain("uses: ./.github/actions/ci-content-hash-write");
    expect(unit).toContain("execution: unit");
    expect(unit).toContain("bun run check");
    expect(unit).toContain("flags: unit");

    for (const [job, execution] of [
      ["component-svelte", "component_svelte"],
      ["component-spikes", "component_spikes"],
      ["component-journeys", "component_journeys"],
    ] as const) {
      const action = jobAction(job);
      expect(action).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(action).toContain(`execution: ${execution}`);
      expect(action).toContain("container_tag:");
      expect(action).toContain("uses: ./.github/actions/ci-content-hash-write");
    }

    const consumer = jobAction("consumer-compat");
    expect(consumer).toContain("execution: consumer");
    expect(consumer).toContain("matrix_node:");
    expect(consumer).toContain("runtime_node_version:");
    expect(consumer).toContain("node -v");

    for (const job of ["build", "svelte-check", "docs-site", "actions-security", "bench-smoke"]) {
      const action = jobAction(job);
      expect(action).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(action).toContain("uses: ./.github/actions/ci-content-hash-write");
    }
  });

  it("preserves browser / journeys / build invariants inside job bodies", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("mcr.microsoft.com/playwright:v1.61.1-noble");
    expect(ci).toContain("HOME: /root");

    const svelte = jobAction("component-svelte");
    expect(svelte).toContain("working-directory: packages/svelte");
    expect(svelte).toContain("flags: svelte");
    expect(svelte).not.toContain("run: bun run build\n");

    const spikes = jobAction("component-spikes");
    expect(spikes).toContain("working-directory: spikes/browser");
    expect(spikes).not.toContain("run: bun run build\n");

    const journeys = jobAction("component-journeys");
    expect(journeys).toContain("bun run build:docs");
    expect(journeys).toContain("interaction-accessibility.spec.ts");
    expect(journeys).toContain("docs-home-gallery.spec.ts");
    expect(journeys).toContain("docs-progressive-search.spec.ts");
    expect(journeys).toContain("docs-themes.spec.ts");
    expect(journeys).toContain("--grep-invert 'visual contract'");
    expect(journeys).not.toContain("bun run test:interaction-perf");

    const journeysJob = jobSlice(ci, "component-journeys");
    expect(journeysJob).toContain("docs_journeys == 'true'");

    const perf = jobAction("interaction-perf");
    expect(perf).toContain("bun run test:interaction-perf");
    const perfJob = jobSlice(ci, "interaction-perf");
    expect(perfJob).toContain("informational");
    expect(perfJob).toContain("interaction_perf == 'true'");

    const build = jobAction("build");
    const syncAt = build.indexOf("svelte-kit sync");
    const typeAwareAt = build.indexOf("lint:type-aware");
    expect(syncAt).toBeGreaterThan(-1);
    expect(typeAwareAt).toBeGreaterThan(syncAt);

    const docs = jobAction("docs-site");
    expect(docs).toContain("bun run build:docs");
    expect(docs).toContain("bun run check:pages-links");

    const actions = jobAction("actions-security");
    expect(actions).toMatch(/zizmor==1\.26\.1 \.github\/workflows \.github\/actions/);

    const gate = jobAction("ci-gate");
    expect(gate).toContain("bun scripts/ci-gate.ts");
    expect(existsSync(join(root, "scripts/ci-gate.ts"))).toBe(true);
    const gateSrc = read("scripts/ci-gate.ts");
    expect(gateSrc).toContain("COMPONENT_SVELTE_RES");
    expect(gateSrc).toContain("COMPONENT_SPIKES_RES");
    expect(gateSrc).toContain("DOCS_JOURNEYS_RES");
    expect(gateSrc).toContain("evaluateGate");
  });
});

describe("Dependabot covers CI composites", () => {
  it("lists every .github/actions/* directory under github-actions", () => {
    const dependabot = read(".github/dependabot.yml");
    const actionDirs = readdirSync(join(root, ".github/actions"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .toSorted();
    expect(actionDirs.length).toBeGreaterThan(10);
    for (const dir of actionDirs) {
      expect(dependabot).toContain(`"/.github/actions/${dir}"`);
    }
  });
});

describe("ci.yml size budget (maintainability)", () => {
  it("stays under 500 lines after job-body extraction (path to ~300)", () => {
    const lines = read(".github/workflows/ci.yml").split("\n").length;
    // Header comments + job skeletons + detect outputs. Follow-up can trim comments.
    expect(lines).toBeLessThan(500);
    expect(lines).toBeGreaterThan(200);
  });
});
