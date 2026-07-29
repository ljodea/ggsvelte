/**
 * Production detect-changes CLI: env wiring + gh/git I/O adapter.
 * Pure driver lives in ./detect-changes; this module is the spawn surface.
 */
import { spawnSync } from "node:child_process";

import { runDetectChanges, type DetectChangesInput, type DetectChangesIo } from "./detect-changes";
import { writeGithubOutput as appendGithubOutput } from "./cli-io";

/**
 * Production I/O for `detect-changes` — mirrors the former ci.yml bash:
 * swallow gh/git fetch/diff failures; exact-key GITHUB_OUTPUT write.
 */
function createDetectChangesIo(): DetectChangesIo {
  return {
    commandExists(name: string): boolean {
      const r = spawnSync("bash", ["-c", `command -v ${JSON.stringify(name)}`], {
        encoding: "utf8",
      });
      return r.status === 0;
    },
    findLastSuccessfulMainHead(repo: string, headSha: string): string | undefined {
      // Issue #244 cumulative main range. See lastSuccessfulMainHeadJq — gh api
      // has no jq --arg; the former bash form was a silent no-op under `|| true`.
      const r = spawnSync(
        "gh",
        [
          "api",
          `repos/${repo}/actions/workflows/ci.yml/runs?branch=main&status=completed&per_page=20`,
          "--jq",
          lastSuccessfulMainHeadJq(headSha),
        ],
        { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      );
      if (r.status !== 0) return undefined;
      const sha = (r.stdout ?? "").trim();
      return sha.length > 0 ? sha : undefined;
    },
    gitFetchDepth1(sha: string): void {
      spawnSync("git", ["fetch", "--no-tags", "--depth=1", "origin", sha], {
        encoding: "utf8",
        stdio: "ignore",
      });
    },
    gitCommitExists(sha: string): boolean {
      const r = spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
        encoding: "utf8",
        stdio: "ignore",
      });
      return r.status === 0;
    },
    gitDiffNameStatus(base: string, head: string): string[] | "error" {
      // Large renames can exceed Node's default 1 MiB maxBuffer; treat overflow
      // as error → force-all rather than silent checks-only.
      const r = spawnSync("git", ["diff", "--name-status", `${base}...${head}`], {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
      });
      if (r.error || r.status !== 0) return "error";
      const text = r.stdout ?? "";
      return text
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
    },
    writeGithubOutput(body: string): void {
      appendGithubOutput(body);
      process.stdout.write(body);
    },
    log(msg: string): void {
      process.stdout.write(`${msg}\n`);
    },
  };
}

/** jq program for last successful main CI head, excluding the current head. */
export function lastSuccessfulMainHeadJq(headSha: string): string {
  const headLit = JSON.stringify(headSha);
  return `[.workflow_runs[] | select(.conclusion == "success" and .head_sha != ${headLit}) | .head_sha][0] // empty`;
}

export function runDetectChangesCli(): void {
  const env = process.env;
  const input: DetectChangesInput = {
    eventName: env["EVENT_NAME"] ?? "",
    githubRef: env["GITHUB_REF"] ?? "",
    baseSha: env["BASE_SHA"] ?? "",
    headSha: env["HEAD_SHA"] ?? "",
    prLabels: env["PR_LABELS"] ?? "",
    repo: env["REPO"] ?? "",
  };
  if (input.eventName.length === 0) {
    throw new Error("detect-changes requires EVENT_NAME");
  }
  if (input.headSha.length === 0) {
    throw new Error("detect-changes requires HEAD_SHA");
  }
  if (input.repo.length === 0) {
    throw new Error("detect-changes requires REPO");
  }
  const outPath = env["GITHUB_OUTPUT"];
  if (typeof outPath !== "string" || outPath.length === 0) {
    throw new Error("detect-changes requires GITHUB_OUTPUT (job outputs path)");
  }
  runDetectChanges(input, createDetectChangesIo());
}
