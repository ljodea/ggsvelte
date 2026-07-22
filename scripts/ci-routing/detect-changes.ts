/**
 * detect-changes job driver (extracted from .github/workflows/ci.yml).
 *
 * Computes the final JobPlan (path routing + #244 main thinning + #246
 * run-compat) and writes GITHUB_OUTPUT once. Git/gh side effects are
 * injected so unit tests never touch the network.
 */
import {
  classifyChangedPaths,
  formatGithubOutputs,
  parseNameStatusList,
  planJobs,
  type JobPlan,
} from "./routing";
import { shouldBypassContentCache } from "./content-hash";

export const ZERO_SHA = "0000000000000000000000000000000000000000";

export type DetectChangesInput = {
  eventName: string;
  githubRef: string;
  baseSha: string;
  headSha: string;
  /** Comma-separated PR labels (GHA join). Matching is exact line after split — no trim. */
  prLabels: string;
  repo: string;
};

/**
 * I/O surface for the driver. Production wires real git/gh; tests inject fakes.
 */
export type DetectChangesIo = {
  commandExists: (name: string) => boolean;
  /**
   * Last successful main CI head excluding `headSha`, or undefined when
   * unavailable / API fails / empty (mirrors `gh … || true` + empty jq).
   */
  findLastSuccessfulMainHead: (repo: string, headSha: string) => string | undefined;
  /** Best-effort fetch; failures ignored (bash: `git fetch … || true`). */
  gitFetchDepth1: (sha: string) => void;
  gitCommitExists: (sha: string) => boolean;
  /**
   * `git diff --name-status base...head` lines.
   * - `string[]` — successful diff (may be empty → checks-only)
   * - `"error"` — command failed / buffer overflow → force-all (do not
   *   collapse to empty/checks-only; that would skip product jobs while
   *   detect-changes still greens)
   */
  gitDiffNameStatus: (base: string, head: string) => string[] | "error";
  writeGithubOutput: (body: string) => void;
  log: (msg: string) => void;
};

export function isMissingBase(baseSha: string): boolean {
  return baseSha.length === 0 || baseSha === ZERO_SHA;
}

export function isMainPush(eventName: string, githubRef: string): boolean {
  return eventName === "push" && githubRef === "refs/heads/main";
}

/** Exact label match after comma-split (no trim) — matches bash `grep -qx`. */
export function hasExactLabel(prLabels: string, label: string): boolean {
  if (prLabels.length === 0) return false;
  return prLabels.split(",").some((line) => line === label);
}

/**
 * Apply #244 main thinning: consumer / bench_smoke / interaction_perf off.
 * Does not touch component or packages_dist (Codecov main badges).
 */
export function applyMainPushThinning(plan: JobPlan): JobPlan {
  return {
    ...plan,
    consumer: false,
    bench_smoke: false,
    interaction_perf: false,
  };
}

/** Apply #246 run-compat: force consumer + packages_dist on. */
export function applyRunCompat(plan: JobPlan): JobPlan {
  return {
    ...plan,
    consumer: true,
    packages_dist: true,
  };
}

type RouteResolution =
  | { kind: "force_all"; reason: string }
  | { kind: "files"; files: string[]; baseSha: string; empty: boolean };

/**
 * Resolve which files (or force-all) feed path routing — pure given io fakes.
 */
export function resolveRouteInputs(
  input: DetectChangesInput,
  io: DetectChangesIo,
): RouteResolution {
  if (isMissingBase(input.baseSha)) {
    return { kind: "force_all", reason: "no usable base SHA — force-all" };
  }

  let baseSha = input.baseSha;

  // Main + cancel-in-progress: widen base to last successful CI head on main.
  if (isMainPush(input.eventName, input.githubRef) && io.commandExists("gh")) {
    const lastOk = io.findLastSuccessfulMainHead(input.repo, input.headSha);
    if (lastOk !== undefined && lastOk.length > 0) {
      io.log(`widening main route base ${input.baseSha} → last successful CI ${lastOk}`);
      baseSha = lastOk;
    }
  }

  io.gitFetchDepth1(baseSha);
  if (!io.gitCommitExists(baseSha)) {
    return { kind: "force_all", reason: `base SHA ${baseSha} not resolvable — force-all` };
  }

  const nameStatusLines = io.gitDiffNameStatus(baseSha, input.headSha);
  if (nameStatusLines === "error") {
    return {
      kind: "force_all",
      reason: `git diff --name-status failed for ${baseSha}...${input.headSha} — force-all`,
    };
  }
  if (nameStatusLines.length === 0) {
    return { kind: "files", files: [], baseSha, empty: true };
  }
  // parseNameStatusList keeps rename/copy both sides (same as emit --stdin path).
  const files = parseNameStatusList(nameStatusLines.join("\n"));
  return { kind: "files", files, baseSha, empty: false };
}

/**
 * Build final job flags after routing + optional main thin + run-compat.
 */
export function buildDetectChangesOutputs(
  input: DetectChangesInput,
  route: RouteResolution,
): { body: string; plan: JobPlan; bypassContentCache: boolean } {
  const forceAll = route.kind === "force_all";
  const files = route.kind === "files" ? route.files : [];
  const changes = classifyChangedPaths(files);
  let plan = planJobs(changes, { forceAll });
  const bypassContentCache = shouldBypassContentCache(changes, { forceAll });

  // #244: thin only on main push with a resolved non-empty diff.
  // force-all and empty-diff stay full / checks-only (no thin).
  if (
    !forceAll &&
    route.kind === "files" &&
    !route.empty &&
    isMainPush(input.eventName, input.githubRef)
  ) {
    plan = applyMainPushThinning(plan);
  }

  // #246: last — label always wins on PRs, including force-all / empty paths.
  if (input.eventName === "pull_request" && hasExactLabel(input.prLabels, "run-compat")) {
    plan = applyRunCompat(plan);
  }

  const body = formatGithubOutputs(plan, { bypassContentCache });
  return { body, plan, bypassContentCache };
}

/**
 * Full detect-changes driver: resolve route → plan → single GITHUB_OUTPUT write.
 */
export function runDetectChanges(input: DetectChangesInput, io: DetectChangesIo): void {
  const route = resolveRouteInputs(input, io);

  if (route.kind === "force_all") {
    io.log(route.reason);
  } else if (route.empty) {
    io.log("empty changed-file set — checks-only routing");
  } else {
    io.log(
      `event=${input.eventName} base=${route.baseSha} head=${input.headSha} files=${route.files.length}`,
    );
    if (isMainPush(input.eventName, input.githubRef)) {
      io.log(
        "main push: thinned consumer/bench (issue #244); packages_dist+component stay path-routed for coverage",
      );
    }
  }

  if (input.eventName === "pull_request" && hasExactLabel(input.prLabels, "run-compat")) {
    io.log("run-compat: forced consumer + packages_dist (issue #246)");
  }

  const { body } = buildDetectChangesOutputs(input, route);
  io.writeGithubOutput(body);
}
