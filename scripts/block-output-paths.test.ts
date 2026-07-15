import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";

const guard = resolve(import.meta.dir, "guards/block-output-paths.sh");
const repos: string[] = [];

afterEach(() => {
  for (const repo of repos.splice(0)) rmSync(repo, { recursive: true, force: true });
});

function repoWithTrackedBaseline(): string {
  const repo = mkdtempSync(resolve(tmpdir(), "ggsvelte-output-guard-"));
  repos.push(repo);
  spawnSync("git", ["init", "-b", "main", repo]);
  git(repo, ["config", "user.name", "Guard Test"]);
  git(repo, ["config", "user.email", "guard@example.test"]);
  mkdirSync(resolve(repo, "tests/visual/__screenshots__"), { recursive: true });
  writeFileSync(resolve(repo, "tests/visual/__screenshots__/plot.png"), "baseline");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "baseline"]);
  return repo;
}

function git(repo: string, args: string[]) {
  return spawnSync("git", args, { env: isolatedGitEnv(repo) });
}

function isolatedGitEnv(repo: string) {
  return { ...process.env, GIT_DIR: resolve(repo, ".git"), GIT_WORK_TREE: repo };
}

function runGuard(repo: string) {
  return spawnSync("bash", [guard, "tests/visual/__screenshots__/plot.png"], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...isolatedGitEnv(repo),
      GITHUB_HEAD_REF: "",
      GITHUB_REF_NAME: "",
    },
  });
}

describe("block-output-paths guard", () => {
  it("allows clean tracked baselines during all-files CI", () => {
    expect(runGuard(repoWithTrackedBaseline()).status).toBe(0);
  });

  it("blocks a newly staged baseline on an ordinary branch", () => {
    const repo = repoWithTrackedBaseline();
    writeFileSync(resolve(repo, "tests/visual/__screenshots__/plot.png"), "changed");
    git(repo, ["add", "."]);
    const result = runGuard(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("plot.png");
  });

  it("allows the audited visual-update branch", () => {
    const repo = repoWithTrackedBaseline();
    git(repo, ["switch", "-c", "vr-update/pr-11"]);
    writeFileSync(resolve(repo, "tests/visual/__screenshots__/plot.png"), "approved");
    git(repo, ["add", "."]);
    expect(runGuard(repo).status).toBe(0);
  });
});
