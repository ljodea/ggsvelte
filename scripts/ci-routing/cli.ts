/**
 * CLI dispatcher for path routing, gates, and content-hash helpers.
 * Invoked only via `scripts/ci-routing.ts` (`import.meta.main` lives there).
 *
 * Command modules:
 * - ./detect-changes-cli — detect-changes production adapter
 * - ./content-hash-cli — hash-inputs / write / validate success markers
 * - ./cli-io — shared flagValue / writeGithubOutput
 */
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
import { evaluateVrGate } from "./vr-gate";
import { shouldBypassContentCache } from "./content-hash";
import { flagValue, writeGithubOutput } from "./cli-io";
import { runDetectChangesCli } from "./detect-changes-cli";
import {
  runHashInputsCli,
  runValidateSuccessMarkerCli,
  runWriteSuccessMarkerCli,
} from "./content-hash-cli";

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
    writeGithubOutput(body);
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

  if (cmd === "vr-gate") {
    runVrGateCli();
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
  bun scripts/ci-routing.ts hash-inputs --execution <name> [--os <runner.os>] [--container-tag <tag>] [--shard I/N] [--matrix-node N --matrix-pm NAME --matrix-pm-version V --matrix-svelte V] [--runtime-node-version V --runtime-pm-version V]
  bun scripts/ci-routing.ts write-success-marker --execution <name> --hash <hex> [--shard I/N]
  bun scripts/ci-routing.ts validate-success-marker --execution <name> --hash <hex> [--shard I/N]
  bun scripts/ci-routing.ts gate --required <file|-> --results <file|->
  bun scripts/ci-routing.ts ci-gate
  bun scripts/ci-routing.ts vr-gate

  detect-changes reads EVENT_NAME, GITHUB_REF, BASE_SHA, HEAD_SHA, PR_LABELS,
  REPO, GITHUB_OUTPUT (and uses gh/git for main base widening).
  --from-git uses git diff --name-status (rename source + dest).
  --stdin accepts plain paths or name-status lines (tab-separated).
  hash-inputs uses git ls-tree -r HEAD (fail-closed). Emits hash + cache_key (+ GITHUB_OUTPUT).
  ci-gate reads the ci.yml ci-gate job's required/result env vars (CHECKS_REQ
  .. DOCS_JOURNEYS_REQ, CHECKS_RES .. VR_GUARD_RES, EVENT_NAME) and evaluates
  the required-jobs gate, including component-shard rollup and the PR-only
  vr-baseline-guard rule. Prints "ci-gate ok" or "ci-gate failed: <list>".
  vr-gate reads vr-compare.yml's DETECT_RESULT, VR_ROUTED and COMPARE_RESULT
  and decides the required pixel check: routed pixel compares must succeed,
  unrouted ones need nothing (#742).
`);
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
    eventName: env["EVENT_NAME"] ?? "",
    required,
    results: {
      checks: env["CHECKS_RES"],
      unit: env["UNIT_RES"],
      consumer: env["CONSUMER_RES"],
      build: env["BUILD_RES"],
      svelte_check: env["SVELTE_CHECK_RES"],
      docs_site: env["DOCS_SITE_RES"],
      actions_security: env["ACTIONS_RES"],
      bench_smoke: env["BENCH_RES"],
      packages_dist: env["PACKAGES_DIST_RES"],
      docs_journeys: env["DOCS_JOURNEYS_RES"],
    },
    componentShardResults: [
      env["COMPONENT_SVELTE_RES"],
      env["COMPONENT_SVELTE_FX_RES"],
      env["COMPONENT_SPIKES_RES"],
    ],
    vrBaselineGuardResult: env["VR_GUARD_RES"],
  });
  if (!gate.ok) {
    process.stderr.write(`ci-gate failed: ${gate.failures.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("ci-gate ok\n");
}

/** vr-compare.yml's `vr-gate` job — the required pixel status check (#742). */
function runVrGateCli(): void {
  const env = process.env;
  const verdict = evaluateVrGate({
    detectChangesResult: env["DETECT_RESULT"],
    vrRouted: env["VR_ROUTED"] === "true",
    compareResult: env["COMPARE_RESULT"],
  });
  if (!verdict.ok) {
    process.stderr.write(`vr-gate failed: ${verdict.reason}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`vr-gate ok: ${verdict.reason}\n`);
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

function readArg(path: string): Promise<string> {
  if (path === "-") return new Response(Bun.stdin.stream()).text();
  return Bun.file(path).text();
}
