/**
 * VR approve decision — pure control flow for `.github/workflows/vr-approve.yml`.
 *
 * The approve workflow used to key idempotency on "does the branch tip already
 * carry this render SHA", which is true the instant the branch is pushed. A
 * `vr-update/pr-<n>` branch whose PR was never opened therefore short-circuited
 * every later `/approve-visuals`, stranding correct baselines on an unreachable
 * branch (#680 → issue #717).
 *
 * The unit of idempotency is the open PR, not the branch. This module owns that
 * decision so it is unit-testable; the workflow keeps only credentialed,
 * script-free fact-gathering and the `gh` calls that act on the verdict.
 *
 * Every input is untrusted-shaped text from a shell step, so malformed values
 * throw instead of defaulting — a wrong decision here either strands baselines
 * again or opens duplicate PRs.
 */

import { appendFileSync } from "node:fs";

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export type BranchState = {
  /** Remote tip SHA of `vr-update/pr-<n>`; empty when the branch does not exist. */
  tipSha: string;
  /** Commit message of that tip; empty when the branch does not exist. */
  tipMessage: string;
  /** True when the tip is already contained in the default branch. */
  tipLandedOnDefault: boolean;
  /** Number of the open PR whose head is that branch; null when none is open. */
  openPrNumber: number | null;
};

/**
 * `skip` — the render is already landed or already has an open PR.
 * `open-pr` — the branch is correct but unreachable; open its PR.
 * `render` — regenerate baselines, push, then open the PR.
 */
export type ApproveAction = "skip" | "open-pr" | "render";

export type ApproveDecision = { action: ApproveAction; reason: string };

export type PrCreationDecision = { create: boolean; reason: string };

function assertSha(value: string, label: string): void {
  if (!SHA_PATTERN.test(value)) {
    throw new Error(`invalid ${label}: ${JSON.stringify(value)} (expected 40 lowercase hex chars)`);
  }
}

/**
 * True when the commit message references exactly this render SHA. Hex
 * neighbours are excluded so a longer SHA that merely starts with the render
 * SHA cannot pass for it.
 */
function messageCarriesRender(message: string, renderSha: string): boolean {
  return new RegExp(`(?<![0-9a-f])${renderSha}(?![0-9a-f])`).test(message);
}

export function decideApproveAction(renderSha: string, branch: BranchState): ApproveDecision {
  assertSha(renderSha, "render SHA");
  if (branch.tipSha !== "") assertSha(branch.tipSha, "branch tip SHA");

  if (branch.tipSha === "") {
    return { action: "render", reason: "the vr-update branch does not exist yet" };
  }
  if (!messageCarriesRender(branch.tipMessage, renderSha)) {
    return {
      action: "render",
      reason: `branch tip ${branch.tipSha} does not carry baselines for ${renderSha}`,
    };
  }
  if (branch.tipLandedOnDefault) {
    return {
      action: "skip",
      reason: `branch tip ${branch.tipSha} is already contained in the default branch`,
    };
  }
  if (branch.openPrNumber !== null) {
    return {
      action: "skip",
      reason: `PR #${branch.openPrNumber} is already open for these baselines`,
    };
  }
  return {
    action: "open-pr",
    reason: `branch tip carries baselines for ${renderSha} but has no open PR — opening it`,
  };
}

/**
 * Decided again after the push, against a freshly re-read open-PR number: the
 * `render` path may have pushed onto a branch whose PR was opened meanwhile,
 * and a render that produced no commit has nothing to open a PR for.
 */
export function decidePrCreation(input: {
  action: ApproveAction;
  pushed: boolean;
  openPrNumber: number | null;
}): PrCreationDecision {
  if (input.action === "skip") {
    return { create: false, reason: "approve step skipped — no PR to open" };
  }
  if (input.openPrNumber !== null) {
    return { create: false, reason: `PR #${input.openPrNumber} is already open for the branch` };
  }
  if (input.action === "render" && !input.pushed) {
    return { create: false, reason: "no baseline changes were pushed — nothing to review" };
  }
  return { create: true, reason: "vr-update branch has baselines to land but no open PR" };
}

export function parseOpenPrNumber(raw: string | undefined): number | null {
  const value = (raw ?? "").trim();
  if (value === "") return null;
  if (!/^[0-9]+$/.test(value) || Number(value) < 1) {
    throw new Error(`invalid open PR number: ${JSON.stringify(raw)}`);
  }
  return Number(value);
}

export function parseBooleanFlag(raw: string | undefined, label: string): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`invalid ${label} flag: ${JSON.stringify(raw)} (expected "true" or "false")`);
}

function emit(outputs: Record<string, string>): void {
  const rendered = Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}\n`)
    .join("");
  process.stdout.write(rendered);
  const target = process.env.GITHUB_OUTPUT;
  if (target !== undefined && target !== "") {
    // Values are enum-ish verdicts and single-line reasons — no delimiter needed.
    appendFileSync(target, rendered);
  }
}

if (import.meta.main) {
  const [subcommand] = process.argv.slice(2);
  if (subcommand === "action") {
    const decision = decideApproveAction(process.env.RENDER_SHA ?? "", {
      tipSha: (process.env.BRANCH_TIP_SHA ?? "").trim(),
      tipMessage: process.env.BRANCH_TIP_MESSAGE ?? "",
      tipLandedOnDefault: parseBooleanFlag(process.env.BRANCH_TIP_LANDED, "branch tip landed"),
      openPrNumber: parseOpenPrNumber(process.env.OPEN_PR_NUMBER),
    });
    emit({ action: decision.action, reason: decision.reason });
  } else if (subcommand === "pr-create") {
    const action = process.env.ACTION ?? "";
    if (action !== "skip" && action !== "open-pr" && action !== "render") {
      throw new Error(`invalid action: ${JSON.stringify(process.env.ACTION)}`);
    }
    const decision = decidePrCreation({
      action,
      pushed: parseBooleanFlag(process.env.PUSHED, "pushed"),
      openPrNumber: parseOpenPrNumber(process.env.OPEN_PR_NUMBER),
    });
    emit({ create: String(decision.create), reason: decision.reason });
  } else {
    throw new Error(`unknown subcommand: ${JSON.stringify(subcommand)} (action | pr-create)`);
  }
}
