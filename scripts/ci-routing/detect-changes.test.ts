/**
 * Characterization tests for the detect-changes job driver (issue #393).
 * Injectable I/O — no live git/gh/network.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ZERO_SHA,
  applyMainPushThinning,
  applyRunCompat,
  buildDetectChangesOutputs,
  hasExactLabel,
  isMainPush,
  isMissingBase,
  resolveRouteInputs,
  runDetectChanges,
  type DetectChangesInput,
  type DetectChangesIo,
} from "./detect-changes";
import { classifyChangedPaths, formatGithubOutputs, planJobs } from "./routing";
import { shouldBypassContentCache } from "./content-hash";

function baseInput(over: Partial<DetectChangesInput> = {}): DetectChangesInput {
  return {
    eventName: "pull_request",
    githubRef: "refs/pull/1/merge",
    baseSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    prLabels: "",
    repo: "ljodea/ggsvelte",
    ...over,
  };
}

function mockIo(over: Partial<DetectChangesIo> = {}): DetectChangesIo & {
  logs: string[];
  outputs: string[];
} {
  const logs: string[] = [];
  const outputs: string[] = [];
  return {
    logs,
    outputs,
    commandExists: () => false,
    findLastSuccessfulMainHead: () => undefined,
    gitFetchDepth1: () => {},
    gitCommitExists: () => true,
    gitDiffNameStatus: () => [],
    writeGithubOutput: (body) => {
      outputs.push(body);
    },
    log: (msg) => {
      logs.push(msg);
    },
    ...over,
  };
}

function parseOutput(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of body.trimEnd().split("\n")) {
    const i = line.indexOf("=");
    if (i < 0) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

describe("detect-changes helpers", () => {
  test("isMissingBase treats empty and zero SHA", () => {
    expect(isMissingBase("")).toBe(true);
    expect(isMissingBase(ZERO_SHA)).toBe(true);
    expect(isMissingBase("abc")).toBe(false);
  });

  test("isMainPush requires push + refs/heads/main", () => {
    expect(isMainPush("push", "refs/heads/main")).toBe(true);
    expect(isMainPush("pull_request", "refs/heads/main")).toBe(false);
    expect(isMainPush("push", "refs/heads/feat")).toBe(false);
  });

  test("hasExactLabel matches bash grep -qx after comma split (no trim)", () => {
    expect(hasExactLabel("run-compat", "run-compat")).toBe(true);
    expect(hasExactLabel("docs,run-compat,other", "run-compat")).toBe(true);
    expect(hasExactLabel("run-compat-extra", "run-compat")).toBe(false);
    expect(hasExactLabel(" docs, run-compat", "run-compat")).toBe(false); // space
    expect(hasExactLabel("", "run-compat")).toBe(false);
  });
});

describe("resolveRouteInputs", () => {
  test("missing base → force_all", () => {
    const io = mockIo();
    const r = resolveRouteInputs(baseInput({ baseSha: "" }), io);
    expect(r).toEqual({ kind: "force_all", reason: "no usable base SHA — force-all" });
  });

  test("zero base → force_all", () => {
    const r = resolveRouteInputs(baseInput({ baseSha: ZERO_SHA }), mockIo());
    expect(r.kind).toBe("force_all");
  });

  test("unresolvable base after fetch → force_all", () => {
    const io = mockIo({ gitCommitExists: () => false });
    const r = resolveRouteInputs(baseInput(), io);
    expect(r.kind).toBe("force_all");
    if (r.kind === "force_all") {
      expect(r.reason).toContain("not resolvable");
    }
  });

  test("empty git diff → files empty (checks-only), not force_all", () => {
    const io = mockIo({
      gitDiffNameStatus: () => [],
    });
    const r = resolveRouteInputs(baseInput(), io);
    expect(r).toEqual({
      kind: "files",
      files: [],
      baseSha: baseInput().baseSha,
      empty: true,
    });
  });

  test("git diff error → force_all (not silent checks-only)", () => {
    const io = mockIo({
      gitDiffNameStatus: () => "error",
    });
    const r = resolveRouteInputs(baseInput(), io);
    expect(r.kind).toBe("force_all");
    if (r.kind === "force_all") {
      expect(r.reason).toContain("git diff");
      expect(r.reason).toContain("force-all");
    }
  });

  test("name-status lines parse rename both sides", () => {
    const io = mockIo({
      gitDiffNameStatus: () => ["R100\tpackages/core/src/a.ts\tpackages/core/src/b.ts"],
    });
    const r = resolveRouteInputs(baseInput(), io);
    expect(r.kind).toBe("files");
    if (r.kind === "files") {
      expect(r.files).toContain("packages/core/src/a.ts");
      expect(r.files).toContain("packages/core/src/b.ts");
      expect(r.empty).toBe(false);
    }
  });

  test("main push widens base when gh returns last_ok", () => {
    const lastOk = "cccccccccccccccccccccccccccccccccccccccc";
    const io = mockIo({
      commandExists: (n) => n === "gh",
      findLastSuccessfulMainHead: () => lastOk,
      gitDiffNameStatus: (base) => {
        expect(base).toBe(lastOk);
        return ["M\tpackages/core/src/x.ts"];
      },
    });
    const r = resolveRouteInputs(
      baseInput({ eventName: "push", githubRef: "refs/heads/main" }),
      io,
    );
    expect(r.kind).toBe("files");
    if (r.kind === "files") expect(r.baseSha).toBe(lastOk);
    expect(io.logs.some((l) => l.includes("widening main route base"))).toBe(true);
  });

  test("main push does not widen when gh missing", () => {
    let seenBase = "";
    const io = mockIo({
      commandExists: () => false,
      findLastSuccessfulMainHead: () => {
        throw new Error("should not call");
      },
      gitDiffNameStatus: (base) => {
        seenBase = base;
        return [];
      },
    });
    const input = baseInput({ eventName: "push", githubRef: "refs/heads/main" });
    resolveRouteInputs(input, io);
    expect(seenBase).toBe(input.baseSha);
  });

  test("PR never widens even when gh available", () => {
    let called = false;
    const io = mockIo({
      commandExists: () => true,
      findLastSuccessfulMainHead: () => {
        called = true;
        return "dddddddddddddddddddddddddddddddddddddddd";
      },
      gitDiffNameStatus: () => [],
    });
    resolveRouteInputs(baseInput({ eventName: "pull_request" }), io);
    expect(called).toBe(false);
  });
});

describe("buildDetectChangesOutputs interactions", () => {
  test("force-all emits full suite + bypass true", () => {
    const { body, plan, bypassContentCache } = buildDetectChangesOutputs(baseInput(), {
      kind: "force_all",
      reason: "x",
    });
    expect(bypassContentCache).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.packages_dist).toBe(true);
    const parsed = parseOutput(body);
    expect(parsed.unit).toBe("true");
    expect(parsed.bypass_content_cache).toBe("true");
    // JOB_NAMES order: 14 jobs then bypass
    const lines = body.trimEnd().split("\n");
    expect(lines[0]).toBe("checks=true");
    expect(lines.at(-1)).toBe("bypass_content_cache=true");
    expect(lines.length).toBe(15);
  });

  test("force-all on main push does NOT thin consumer/bench", () => {
    const { plan } = buildDetectChangesOutputs(
      baseInput({ eventName: "push", githubRef: "refs/heads/main" }),
      { kind: "force_all", reason: "x" },
    );
    expect(plan.consumer).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.interaction_perf).toBe(true);
  });

  test("empty files → checks-only (not force-all)", () => {
    const { plan, bypassContentCache } = buildDetectChangesOutputs(baseInput(), {
      kind: "files",
      files: [],
      baseSha: "a",
      empty: true,
    });
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(bypassContentCache).toBe(false);
  });

  test("main push non-empty thins consumer/bench/interaction_perf only", () => {
    const files = ["packages/core/src/x.ts"];
    const { plan } = buildDetectChangesOutputs(
      baseInput({ eventName: "push", githubRef: "refs/heads/main" }),
      { kind: "files", files, baseSha: "a", empty: false },
    );
    const unthinned = planJobs(classifyChangedPaths(files));
    expect(unthinned.consumer).toBe(true); // package surface would schedule consumer
    expect(plan.consumer).toBe(false);
    expect(plan.bench_smoke).toBe(false);
    expect(plan.interaction_perf).toBe(false);
    // Must NOT force-off component / packages_dist
    expect(plan.component).toBe(unthinned.component);
    expect(plan.packages_dist).toBe(unthinned.packages_dist);
    expect(plan.unit).toBe(true);
  });

  test("main push empty diff does not thin (no consumer flags to clear anyway)", () => {
    const { plan } = buildDetectChangesOutputs(
      baseInput({ eventName: "push", githubRef: "refs/heads/main" }),
      { kind: "files", files: [], baseSha: "a", empty: true },
    );
    // Empty path: checks only; thinning branch skipped
    expect(plan.checks).toBe(true);
    expect(plan.consumer).toBe(false);
  });

  test("run-compat on PR forces consumer+packages_dist after empty routing", () => {
    const { plan } = buildDetectChangesOutputs(baseInput({ prLabels: "docs,run-compat" }), {
      kind: "files",
      files: [],
      baseSha: "a",
      empty: true,
    });
    expect(plan.checks).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.packages_dist).toBe(true);
    // Other jobs stay checks-only
    expect(plan.unit).toBe(false);
    expect(plan.component).toBe(false);
  });

  test("run-compat applies on force-all PR (already true — still true)", () => {
    const { plan } = buildDetectChangesOutputs(baseInput({ prLabels: "run-compat" }), {
      kind: "force_all",
      reason: "x",
    });
    expect(plan.consumer).toBe(true);
    expect(plan.packages_dist).toBe(true);
  });

  test("run-compat does not fire on push even with label string present", () => {
    const files = ["README.md"];
    const { plan } = buildDetectChangesOutputs(
      baseInput({
        eventName: "push",
        githubRef: "refs/heads/main",
        prLabels: "run-compat",
      }),
      { kind: "files", files, baseSha: "a", empty: false },
    );
    // README alone → checks only; main thin not changing much; no run-compat
    expect(plan.consumer).toBe(false);
    expect(plan.packages_dist).toBe(false);
  });

  test("bypass_content_cache independent of thinning/run-compat patches", () => {
    const files = ["packages/core/src/x.ts"];
    const changes = classifyChangedPaths(files);
    const expectedBypass = shouldBypassContentCache(changes, { forceAll: false });
    const { bypassContentCache } = buildDetectChangesOutputs(
      baseInput({
        eventName: "push",
        githubRef: "refs/heads/main",
        prLabels: "run-compat", // ignored on push
      }),
      { kind: "files", files, baseSha: "a", empty: false },
    );
    expect(bypassContentCache).toBe(expectedBypass);
  });

  test("applyMainPushThinning / applyRunCompat are pure patches", () => {
    const plan = planJobs(classifyChangedPaths(["packages/core/src/x.ts"]));
    const thinned = applyMainPushThinning(plan);
    expect(thinned.consumer).toBe(false);
    expect(plan.consumer).toBe(true); // original untouched
    const forced = applyRunCompat(thinned);
    expect(forced.consumer).toBe(true);
    expect(forced.packages_dist).toBe(true);
  });
});

describe("runDetectChanges end-to-end (injected io)", () => {
  test("writes single github output body for force-all", () => {
    const io = mockIo();
    runDetectChanges(baseInput({ baseSha: "" }), io);
    expect(io.outputs.length).toBe(1);
    expect(io.logs.some((l) => l.includes("force-all"))).toBe(true);
    expect(parseOutput(io.outputs[0]!).unit).toBe("true");
  });

  test("main package change: one write, thinned flags", () => {
    const io = mockIo({
      gitDiffNameStatus: () => ["M\tpackages/core/src/x.ts"],
    });
    runDetectChanges(baseInput({ eventName: "push", githubRef: "refs/heads/main" }), io);
    expect(io.outputs.length).toBe(1);
    const o = parseOutput(io.outputs[0]!);
    expect(o.unit).toBe("true");
    expect(o.consumer).toBe("false");
    expect(o.bench_smoke).toBe("false");
    expect(o.interaction_perf).toBe("false");
    expect(o.packages_dist).toBe("true");
    expect(io.logs.some((l) => l.includes("thinned consumer/bench"))).toBe(true);
  });

  test("run-compat log + output on labeled PR with empty diff", () => {
    const io = mockIo({ gitDiffNameStatus: () => [] });
    runDetectChanges(baseInput({ prLabels: "run-compat" }), io);
    expect(io.logs.some((l) => l.includes("run-compat: forced"))).toBe(true);
    const o = parseOutput(io.outputs[0]!);
    expect(o.consumer).toBe("true");
    expect(o.packages_dist).toBe("true");
  });
});

describe("production adapter contracts", () => {
  test("lastSuccessfulMainHeadJq embeds head as a JSON string (no jq --arg)", async () => {
    const { lastSuccessfulMainHeadJq } = await import("./cli");
    const jq = lastSuccessfulMainHeadJq("abc123");
    expect(jq).toContain('.head_sha != "abc123"');
    expect(jq).not.toContain("--arg");
    // Escapes quotes inside the sha (defensive — SHAs are hex, but contract is string-safe).
    const weird = lastSuccessfulMainHeadJq('x"y');
    expect(weird).toContain('.head_sha != "x\\"y"');
  });
});

describe("detect-changes CLI smoke", () => {
  test("force-all path via env writes GITHUB_OUTPUT", async () => {
    const dir = mkdtempSync(join(tmpdir(), "detect-changes-"));
    const outPath = join(dir, "github_output");
    try {
      const proc = Bun.spawn(["bun", "scripts/ci-routing.ts", "detect-changes"], {
        cwd: join(import.meta.dir, "../.."),
        env: {
          ...process.env,
          EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/9/merge",
          BASE_SHA: "",
          HEAD_SHA: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          PR_LABELS: "",
          REPO: "ljodea/ggsvelte",
          GITHUB_OUTPUT: outPath,
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      const code = await proc.exited;
      const stderr = await new Response(proc.stderr).text();
      expect(code, stderr).toBe(0);
      const body = readFileSync(outPath, "utf8");
      expect(body).toContain("unit=true");
      expect(body).toContain("bypass_content_cache=true");
      // Matches formatGithubOutputs force-all
      expect(body).toBe(
        formatGithubOutputs(planJobs(classifyChangedPaths([]), { forceAll: true }), {
          bypassContentCache: true,
        }),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
