import { spawnSync } from "node:child_process";
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

function runGuard(branch: string, staged: string, hookArg = baseline) {
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

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
  );
  return spawnSync("bash", [guard, hookArg], {
    cwd: sandbox,
    encoding: "utf8",
    env: {
      ...env,
      PATH: `${bin}:${env.PATH}`,
      FAKE_BRANCH: branch,
      FAKE_STAGED: staged,
      GITHUB_HEAD_REF: "",
      GITHUB_REF_NAME: "",
    },
  });
}

describe("block-output-paths guard", () => {
  it("allows clean tracked baselines during all-files CI", () => {
    expect(runGuard("main", "").status).toBe(0);
  });

  it("blocks a newly staged baseline on an ordinary branch", () => {
    const result = runGuard("feature/ordinary", baseline);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("plot.png");
  });

  it("allows the audited visual-update branch", () => {
    expect(runGuard("vr-update/pr-11", baseline).status).toBe(0);
  });

  it("blocks a newly staged coverage report on an ordinary branch", () => {
    const result = runGuard("feature/ordinary", coverageArtifact, coverageArtifact);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("coverage");
  });
});
