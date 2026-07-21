import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";

const guard = resolve(import.meta.dir, "guards/block-output-paths.sh");
const sandboxes: string[] = [];
const baseline = "tests/visual/__screenshots__/plot.png";
const coverageArtifact = "packages/svelte/coverage/browser/index.html";

afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) rmSync(sandbox, { recursive: true, force: true });
});

function runGuard(
  branch: string,
  staged: string,
  hookArg: string | string[] = baseline,
): SpawnSyncReturns<string> {
  const sandbox = mkdtempSync(resolve(tmpdir(), "ggsvelte-output-guard-"));
  const bin = resolve(sandbox, "bin");
  sandboxes.push(sandbox);
  mkdirSync(bin);
  const fakeGit = resolve(bin, "git");
  writeFileSync(
    fakeGit,
    `#!/bin/sh
case "$1" in
  symbolic-ref) printf '%s\\n' "$FAKE_BRANCH" ;;
  diff) printf '%s\\n' "$FAKE_STAGED" ;;
  *) exit 2 ;;
esac
`,
  );
  chmodSync(fakeGit, 0o755);

  const args = Array.isArray(hookArg) ? hookArg : [hookArg];
  // Minimal env only: spreading process.env on CI leaves GITHUB_* / locale /
  // BASH_ENV values that can change branch resolution or stderr decoding.
  // Empty-string overrides are also unreliable across Node/Bun spawn impls.
  return spawnSync("bash", [guard, ...args], {
    cwd: sandbox,
    encoding: "utf8",
    env: {
      PATH: `${bin}:/usr/bin:/bin`,
      FAKE_BRANCH: branch,
      FAKE_STAGED: staged,
      HOME: sandbox,
      TMPDIR: tmpdir(),
      LC_ALL: "C.UTF-8",
      LANG: "C.UTF-8",
    },
  });
}

function combinedOutput(result: SpawnSyncReturns<string>): string {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

describe("block-output-paths guard", () => {
  it("allows clean tracked baselines during all-files CI", () => {
    expect(runGuard("main", "").status).toBe(0);
  });

  it("blocks a newly staged baseline on an ordinary branch", () => {
    const result = runGuard("feature/ordinary", baseline);
    expect(result.status).toBe(1);
    expect(combinedOutput(result)).toContain("plot.png");
  });

  it("allows the audited visual-update branch", () => {
    expect(runGuard("vr-update/pr-11", baseline).status).toBe(0);
  });

  it("blocks a newly staged coverage report on an ordinary branch", () => {
    const result = runGuard("feature/ordinary", coverageArtifact, coverageArtifact);
    expect(result.status).toBe(1);
    expect(combinedOutput(result)).toContain(coverageArtifact);
  });

  it("blocks coverage reports on audited visual-update branches", () => {
    const result = runGuard("vr-update/pr-11", coverageArtifact, coverageArtifact);
    expect(result.status).toBe(1);
    // vr-update/* only exempts screenshot baselines; coverage stays blocked.
    expect(combinedOutput(result)).toContain(coverageArtifact);
  });

  it("allows same-PR smoke baselines when packages/examples/visual tests are staged", () => {
    const staged = `${baseline}\ntests/visual/smoke-matrix.ts\n`;
    expect(runGuard("ci/vr-smoke-throughput", staged).status).toBe(0);
    expect(
      runGuard("feature/ordinary", `${baseline}\npackages/svelte/src/lib/Plot.svelte\n`).status,
    ).toBe(0);
  });

  it("still blocks baselines justified only by docs content-only paths", () => {
    const staged = `${baseline}\napps/docs/src/lib/catalog/guide.ts\n`;
    const result = runGuard("feature/ordinary", staged);
    expect(result.status).toBe(1);
    expect(combinedOutput(result)).toContain("plot.png");
  });
});
