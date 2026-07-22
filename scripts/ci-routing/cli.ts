/**
 * CLI for path routing and content-hash helpers.
 * Invoked only via `scripts/ci-routing.ts` (`import.meta.main` lives there).
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  classifyChangedPaths,
  evaluateGate,
  formatGithubOutputs,
  parseFileList,
  parseNameStatusList,
  planJobs,
  type JobName,
  type JobPlan,
} from "./routing";
import { evaluateCiGate } from "./ci-gate";
import {
  CACHEABLE_EXECUTIONS,
  CONTENT_HASH_SCHEMA,
  collectGitHeadInputDigests,
  contentHashCacheKey,
  parseSuccessMarker,
  serializeSuccessMarker,
  shouldBypassContentCache,
  successMarkerPath,
  validateSuccessMarker,
  type CacheableExecution,
} from "./content-hash";
import { runDetectChanges, type DetectChangesInput, type DetectChangesIo } from "./detect-changes";

export async function runCiRoutingCli(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const cmd = args[0] ?? "help";

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  if (cmd === "classify") {
    const files = await resolveFiles(args.slice(1));
    const flags = classifyChangedPaths(files);
    process.stdout.write(`${JSON.stringify(flags, null, 2)}\n`);
    return;
  }

  if (cmd === "plan") {
    const { files, forceAll } = await resolvePlanArgs(args.slice(1));
    const plan = planJobs(classifyChangedPaths(files), { forceAll });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  if (cmd === "emit-github-output") {
    const { files, forceAll } = await resolvePlanArgs(args.slice(1));
    const changes = classifyChangedPaths(files);
    const plan = planJobs(changes, { forceAll });
    const bypassContentCache = shouldBypassContentCache(changes, { forceAll });
    const body = formatGithubOutputs(plan, { bypassContentCache });
    const outPath = process.env.GITHUB_OUTPUT;
    if (typeof outPath === "string" && outPath.length > 0) {
      appendFileSync(outPath, body);
    }
    process.stdout.write(body);
    return;
  }

  if (cmd === "detect-changes") {
    runDetectChangesCli();
    return;
  }

  if (cmd === "hash-inputs") {
    await runHashInputsCli(args.slice(1));
    return;
  }

  if (cmd === "write-success-marker") {
    runWriteSuccessMarkerCli(args.slice(1));
    return;
  }

  if (cmd === "validate-success-marker") {
    await runValidateSuccessMarkerCli(args.slice(1));
    return;
  }

  if (cmd === "ci-gate") {
    runCiGateCli();
    return;
  }

  if (cmd === "gate") {
    const requiredPath = flagValue(args, "--required");
    const resultsPath = flagValue(args, "--results");
    if (requiredPath === undefined || resultsPath === undefined) {
      throw new Error("gate requires --required <json-file-or--> and --results <json-file-or-->");
    }
    const required = JSON.parse(await readArg(requiredPath)) as JobPlan;
    const results = JSON.parse(await readArg(resultsPath)) as Partial<Record<JobName, string>>;
    const gate = evaluateGate(required, results);
    process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
    if (!gate.ok) {
      process.stderr.write(`ci-gate failed: ${gate.failures.join(", ")}\n`);
      process.exitCode = 1;
    }
    return;
  }

  printHelp();
  process.exitCode = 1;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  bun scripts/ci-routing.ts classify [--files f1 f2 | --from-git --base <ref> | --stdin]
  bun scripts/ci-routing.ts plan [--files ... | --from-git --base <ref> | --stdin] [--force-all]
  bun scripts/ci-routing.ts emit-github-output [--files ... | --from-git --base <ref> | --stdin] [--force-all]
  bun scripts/ci-routing.ts detect-changes
  bun scripts/ci-routing.ts hash-inputs --execution <name> [--os <runner.os>] [--container-tag <tag>] [--matrix-node N --matrix-pm NAME --matrix-pm-version V --matrix-svelte V] [--runtime-node-version V --runtime-pm-version V]
  bun scripts/ci-routing.ts write-success-marker --execution <name> --hash <hex>
  bun scripts/ci-routing.ts validate-success-marker --execution <name> --hash <hex>
  bun scripts/ci-routing.ts gate --required <file|-> --results <file|->
  bun scripts/ci-routing.ts ci-gate

  detect-changes reads EVENT_NAME, GITHUB_REF, BASE_SHA, HEAD_SHA, PR_LABELS,
  REPO, GITHUB_OUTPUT (and uses gh/git for main base widening).
  --from-git uses git diff --name-status (rename source + dest).
  --stdin accepts plain paths or name-status lines (tab-separated).
  hash-inputs uses git ls-tree -r HEAD (fail-closed). Emits hash + cache_key (+ GITHUB_OUTPUT).
  ci-gate reads the ci.yml ci-gate job's required/result env vars (CHECKS_REQ
  .. DOCS_JOURNEYS_REQ, CHECKS_RES .. VR_GUARD_RES, EVENT_NAME) and evaluates
  the required-jobs gate, including component-shard rollup and the PR-only
  vr-baseline-guard rule. Prints "ci-gate ok" or "ci-gate failed: <list>".
`);
}

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
      writeGithubOutput(body);
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

function runDetectChangesCli(): void {
  const env = process.env;
  const input: DetectChangesInput = {
    eventName: env.EVENT_NAME ?? "",
    githubRef: env.GITHUB_REF ?? "",
    baseSha: env.BASE_SHA ?? "",
    headSha: env.HEAD_SHA ?? "",
    prLabels: env.PR_LABELS ?? "",
    repo: env.REPO ?? "",
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
  const outPath = env.GITHUB_OUTPUT;
  if (typeof outPath !== "string" || outPath.length === 0) {
    throw new Error("detect-changes requires GITHUB_OUTPUT (job outputs path)");
  }
  runDetectChanges(input, createDetectChangesIo());
}

/**
 * `ci-gate` job driver. The workflow's bash guard on `DETECT_RESULT` runs
 * before this command (see ci.yml's `ci-gate` job) — by the time this is
 * invoked, detect-changes is known to have succeeded.
 */
function runCiGateCli(): void {
  const env = process.env;
  const req = (k: string) => env[k] === "true";
  const required: JobPlan = {
    checks: req("CHECKS_REQ"),
    unit: req("UNIT_REQ"),
    component: req("COMPONENT_REQ"),
    consumer: req("CONSUMER_REQ"),
    build: req("BUILD_REQ"),
    svelte_check: req("SVELTE_CHECK_REQ"),
    docs_site: req("DOCS_SITE_REQ"),
    actions_security: req("ACTIONS_REQ"),
    bench_smoke: req("BENCH_REQ"),
    interaction_perf: false,
    packages_dist: req("PACKAGES_DIST_REQ"),
    vr: false,
    pages: false,
    docs_journeys: req("DOCS_JOURNEYS_REQ"),
  };
  const gate = evaluateCiGate({
    eventName: env.EVENT_NAME ?? "",
    required,
    results: {
      checks: env.CHECKS_RES,
      unit: env.UNIT_RES,
      consumer: env.CONSUMER_RES,
      build: env.BUILD_RES,
      svelte_check: env.SVELTE_CHECK_RES,
      docs_site: env.DOCS_SITE_RES,
      actions_security: env.ACTIONS_RES,
      bench_smoke: env.BENCH_RES,
      packages_dist: env.PACKAGES_DIST_RES,
      docs_journeys: env.DOCS_JOURNEYS_RES,
    },
    componentSvelteResult: env.COMPONENT_SVELTE_RES,
    componentSpikesResult: env.COMPONENT_SPIKES_RES,
    vrBaselineGuardResult: env.VR_GUARD_RES,
  });
  if (!gate.ok) {
    process.stderr.write(`ci-gate failed: ${gate.failures.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("ci-gate ok\n");
}

function parseCacheableExecution(raw: string | undefined): CacheableExecution {
  if (raw === undefined || raw.length === 0) {
    throw new Error("--execution <name> is required");
  }
  if (!(CACHEABLE_EXECUTIONS as readonly string[]).includes(raw)) {
    throw new Error(
      `unknown execution "${raw}"; expected one of: ${CACHEABLE_EXECUTIONS.join(", ")}`,
    );
  }
  return raw as CacheableExecution;
}

async function runHashInputsCli(args: string[]): Promise<void> {
  const execution = parseCacheableExecution(flagValue(args, "--execution"));
  const os = flagValue(args, "--os") ?? process.env.RUNNER_OS ?? "unknown";
  const containerTag = flagValue(args, "--container-tag");
  const matrixNode = flagValue(args, "--matrix-node");
  const matrixPm = flagValue(args, "--matrix-pm");
  const matrixPmVersion = flagValue(args, "--matrix-pm-version");
  const matrixSvelte = flagValue(args, "--matrix-svelte");
  const runtimeNodeVersion = flagValue(args, "--runtime-node-version");
  const runtimePmVersion = flagValue(args, "--runtime-pm-version");

  const { hash, paths } = await collectGitHeadInputDigests(execution);
  const matrix =
    matrixNode !== undefined &&
    matrixPm !== undefined &&
    matrixPmVersion !== undefined &&
    matrixSvelte !== undefined
      ? {
          node: matrixNode,
          packageManager: matrixPm,
          packageManagerVersion: matrixPmVersion,
          svelte: matrixSvelte,
        }
      : undefined;

  const runtime =
    runtimeNodeVersion !== undefined &&
    runtimeNodeVersion.length > 0 &&
    runtimePmVersion !== undefined &&
    runtimePmVersion.length > 0
      ? { nodeVersion: runtimeNodeVersion, packageManagerVersion: runtimePmVersion }
      : undefined;

  if (execution === "consumer" && (matrix === undefined || runtime === undefined)) {
    throw new Error(
      "hash-inputs consumer requires --matrix-* and --runtime-node-version / --runtime-pm-version",
    );
  }

  const cacheKey = contentHashCacheKey({
    execution,
    hash,
    os,
    containerTag: containerTag ?? undefined,
    matrix,
    runtime,
  });
  const marker = successMarkerPath(execution);
  const body = [
    `hash=${hash}`,
    `cache_key=${cacheKey}`,
    `marker_path=${marker}`,
    `path_count=${paths.length}`,
    `execution=${execution}`,
  ].join("\n");

  const outPath = process.env.GITHUB_OUTPUT;
  if (typeof outPath === "string" && outPath.length > 0) {
    appendFileSync(outPath, `${body}\n`);
  }
  process.stdout.write(`${body}\n`);
}

function runWriteSuccessMarkerCli(args: string[]): void {
  const execution = parseCacheableExecution(flagValue(args, "--execution"));
  const hash = flagValue(args, "--hash");
  if (hash === undefined || hash.length === 0) {
    throw new Error("write-success-marker requires --hash <hex>");
  }
  const path = successMarkerPath(execution);
  const dir = path.slice(0, path.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    serializeSuccessMarker({ schema: CONTENT_HASH_SCHEMA, execution, hash }),
    "utf8",
  );
  process.stdout.write(`${path}\n`);
}

async function runValidateSuccessMarkerCli(args: string[]): Promise<void> {
  const execution = parseCacheableExecution(flagValue(args, "--execution"));
  const hash = flagValue(args, "--hash");
  if (hash === undefined || hash.length === 0) {
    throw new Error("validate-success-marker requires --hash <hex>");
  }
  const path = successMarkerPath(execution);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    process.stdout.write("hit=false\n");
    writeGithubOutput("hit=false\n");
    return;
  }
  const body = await file.text();
  const marker = parseSuccessMarker(body);
  const ok = validateSuccessMarker(marker, { execution, hash });
  const line = `hit=${ok ? "true" : "false"}\n`;
  process.stdout.write(line);
  writeGithubOutput(line);
  if (!ok) {
    process.exitCode = 0; // miss is not a failure — caller runs full job
  }
}

function writeGithubOutput(body: string): void {
  const outPath = process.env.GITHUB_OUTPUT;
  if (typeof outPath === "string" && outPath.length > 0) {
    appendFileSync(outPath, body);
  }
}

async function resolvePlanArgs(args: string[]): Promise<{ files: string[]; forceAll: boolean }> {
  const forceAll = args.includes("--force-all");
  const files = await resolveFiles(args.filter((a) => a !== "--force-all"));
  return { files, forceAll };
}

async function resolveFiles(args: string[]): Promise<string[]> {
  if (args.includes("--stdin")) {
    const text = await new Response(Bun.stdin.stream()).text();
    // Workflows pass `git diff --name-status` lines so renames keep both paths.
    // Plain path lists (one path per line, no tabs) still work via parseFileList.
    if (text.includes("\t") || /^[AMDCRT?]+\d*\t/m.test(text)) {
      return parseNameStatusList(text);
    }
    return parseFileList(text);
  }

  const filesIdx = args.indexOf("--files");
  if (filesIdx >= 0) {
    return args.slice(filesIdx + 1).filter((a) => !a.startsWith("--"));
  }

  if (args.includes("--from-git")) {
    const base = flagValue(args, "--base");
    if (base === undefined || base === "") {
      throw new Error("--from-git requires --base <ref>");
    }
    // --name-status keeps rename/copy source paths for classification.
    const proc = Bun.spawn(["git", "diff", "--name-status", `${base}...HEAD`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`git diff failed (exit ${code}): ${stderr.trim()}`);
    }
    return parseNameStatusList(stdout);
  }

  // Default: empty list (caller should pass --force-all when appropriate).
  return [];
}

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0) return undefined;
  return args[i + 1];
}

function readArg(path: string): Promise<string> {
  if (path === "-") return new Response(Bun.stdin.stream()).text();
  return Bun.file(path).text();
}
