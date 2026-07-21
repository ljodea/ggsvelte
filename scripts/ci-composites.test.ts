/**
 * Characterization + contract tests for CI step-cluster composites extracted
 * from ci.yml (packages-dist download/verify, setup-bun pin, bun-install cache).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const SETUP_BUN = ".github/actions/ci-setup-bun/action.yml";
const BUN_INSTALL = ".github/actions/ci-bun-install/action.yml";
const DOWNLOAD_DIST = ".github/actions/ci-download-packages-dist/action.yml";

/** Jobs that download the shared packages-dist artifact. */
const PACKAGES_DIST_CONSUMERS = [
  "consumer-compat",
  "component-svelte",
  "component-spikes",
  "component-journeys",
  "interaction-perf",
] as const;

/** Jobs that run setup-bun (every Linux CI job except pure aggregators that still set it up). */
const SETUP_BUN_JOBS = [
  "detect-changes",
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

/** Jobs that use the cache+install composite (not consumer-compat — install without actions/cache). */
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

const CONTAINER_BUN_INSTALL_JOBS = new Set([
  "component-svelte",
  "component-spikes",
  "component-journeys",
  "interaction-perf",
]);

function jobSlice(ci: string, jobId: string): string {
  const start = ci.indexOf(`  ${jobId}:\n`);
  expect(start, `job ${jobId} missing`).toBeGreaterThan(-1);
  const rest = ci.slice(start + 1);
  const next = rest.search(/\n  [a-z0-9_-]+:\n/);
  return next === -1 ? ci.slice(start) : ci.slice(start, start + 1 + next);
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

  it("is the sole packages-dist download path for the five consumer jobs", () => {
    const ci = read(".github/workflows/ci.yml");
    for (const jobId of PACKAGES_DIST_CONSUMERS) {
      const job = jobSlice(ci, jobId);
      expect(job, jobId).toContain("uses: ./.github/actions/ci-download-packages-dist");
      // No inline download-artifact for packages-dist in the job body.
      expect(job, jobId).not.toMatch(
        /download-artifact@[0-9a-f]+[\s\S]{0,120}name:\s*packages-dist/,
      );
    }
    // Exactly five uses in ci.yml.
    const uses = ci.match(/uses: \.\/\.github\/actions\/ci-download-packages-dist/g) ?? [];
    expect(uses.length).toBe(5);
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

  it("is used by every CI job that previously inlined setup-bun", () => {
    const ci = read(".github/workflows/ci.yml");
    for (const jobId of SETUP_BUN_JOBS) {
      const job = jobSlice(ci, jobId);
      expect(job, jobId).toContain("uses: ./.github/actions/ci-setup-bun");
      expect(job, jobId).not.toContain("oven-sh/setup-bun@");
    }
    // Inline setup-bun should be gone from ci.yml (lives in composite only).
    expect(ci).not.toContain("oven-sh/setup-bun@");
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
    // Host vs container key prefix via input.
    expect(action).toMatch(/cache_key_prefix|cache-key-prefix/);
  });

  it("wires host vs container cache prefixes for the twelve cache+install jobs", () => {
    const ci = read(".github/workflows/ci.yml");
    for (const jobId of BUN_INSTALL_JOBS) {
      const job = jobSlice(ci, jobId);
      expect(job, jobId).toContain("uses: ./.github/actions/ci-bun-install");
      if (CONTAINER_BUN_INSTALL_JOBS.has(jobId)) {
        expect(job, jobId).toMatch(/cache_key_prefix:\s*bun-container/);
      } else {
        expect(job, jobId).toMatch(/cache_key_prefix:\s*bun\b/);
      }
    }
    // consumer-compat keeps install without actions/cache (matrix OS diversity).
    const consumer = jobSlice(ci, "consumer-compat");
    expect(consumer).not.toContain("uses: ./.github/actions/ci-bun-install");
    expect(consumer).toContain("bun install --frozen-lockfile");
    expect(consumer).toContain("BUN_INSTALL_CACHE_DIR: ${{ runner.temp }}/bun-install-cache");
  });
});

describe("Dependabot covers new CI composites", () => {
  it("lists each composite directory under github-actions", () => {
    const dependabot = read(".github/dependabot.yml");
    for (const dir of [
      '"/.github/actions/ci-content-hash-restore"',
      '"/.github/actions/ci-content-hash-write"',
      '"/.github/actions/ci-setup-bun"',
      '"/.github/actions/ci-bun-install"',
      '"/.github/actions/ci-download-packages-dist"',
    ]) {
      expect(dependabot).toContain(dir);
    }
  });
});
