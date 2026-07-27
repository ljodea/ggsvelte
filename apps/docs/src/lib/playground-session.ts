/**
 * Playground session owner — workbench + agent + run token + interactions + share.
 *
 * Extracted from Playground.svelte so the two state machines cannot drift without
 * a single place that owns the race (#988). Continuations from a superseded or
 * cancelled pipeline never touch state after a newer run (or sample load /
 * hash restore) begins.
 *
 * Plain TypeScript (not `.svelte.ts`) so the race tests live next to the other
 * playground unit suites under `scripts/` via bun:test — no component harness
 * required (#991). DOM, clipboard, and candidate-lifecycle *emission* stay in
 * the shell; this module owns the state transitions.
 */

import type {
  GenerateChartOptions,
  GenerateChartRequest,
  GenerateChartResult,
} from "./playground-agent-client";
import {
  defaultPlaygroundInteractions,
  type PlaygroundAgentEnvelope,
  type PlaygroundInteractions,
} from "./playground-agent-envelope";
import { rateLimitLabelFor, runPlaygroundAgentRun } from "./playground-agent-run";
import {
  agentIsBusy,
  completeAgentSuccess,
  createPlaygroundAgentState,
  failAgent,
  messageForAgentError,
  resolvePhaseLine,
  setAgentDrawing,
  type PlaygroundAgentState,
} from "./playground-agent-state";
import {
  candidateTransitionAccepted,
  type PlaygroundCandidateRef,
} from "./playground-candidate-lifecycle";
import type { PlaygroundSeedV1 } from "./playground-codec";
import type { PlaygroundDatasetId } from "./playground-dataset-schemas";
import { elidePlaygroundDatasetRows } from "./playground-datasets";
import {
  applyPlaygroundHashRestoreState,
  rejectRestoreCancelPhase,
  resolvePlaygroundHashRestore,
  type PlaygroundHashRestoreOrigin,
} from "./playground-hash-restore";
import {
  PLAYGROUND_SAMPLE_DISCARD_CONFIRM,
  PLAYGROUND_UNDO_DISCARD_CONFIRM,
  type PlaygroundShareCatalogs,
} from "./playground-link-policy";
import type { PlaygroundExamplePrompt } from "./playground-prompts";
import {
  confirmPlaygroundRendered,
  createPlaygroundState,
  failPlaygroundCandidate,
  promotePlaygroundCandidate,
  reportPlaygroundDiagnostic,
  setPlaygroundHistoryHash,
  stagePlaygroundSeed,
  type PlaygroundDiagnostic,
  type PlaygroundState,
} from "./playground-state";
import {
  planSampleLoad,
  planUndoChart,
  workbenchCandidateRef,
  type WorkbenchSampleEntry,
} from "./playground-workbench-actions";

export type PlaygroundSessionGenerateChart = (
  req: GenerateChartRequest,
  opts?: GenerateChartOptions,
) => Promise<GenerateChartResult>;

export type PlaygroundSessionConfirm = (message: string) => boolean;

export type PlaygroundSessionHashRestoreSideEffect =
  | { readonly kind: "noop" }
  | {
      readonly kind: "applied";
      readonly previous: PlaygroundCandidateRef | null;
      readonly workbench: PlaygroundState;
      /** When set, shell must `replaceLocationHash` before/with the apply. */
      readonly replaceWithHistoryHash: string | null;
      readonly rejectCancel: {
        readonly generation: number;
        readonly origin: PlaygroundCandidateRef["origin"];
        readonly status: string;
      } | null;
    };

export type PlaygroundSessionWorkbenchChange = {
  readonly previous: PlaygroundCandidateRef | null;
  readonly workbench: PlaygroundState;
};

export interface PlaygroundSessionOptions {
  readonly initialSeed: PlaygroundSeedV1;
  readonly samples: readonly WorkbenchSampleEntry[];
  readonly shareCatalogs: PlaygroundShareCatalogs;
  readonly generateChart: PlaygroundSessionGenerateChart;
  /** Confirm dialogs (defaults to always-true so tests need no window). */
  readonly confirm?: PlaygroundSessionConfirm;
  readonly delay?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  /** Fired after any owned state mutation (Svelte reactivity bridge). */
  readonly onChange?: () => void;
  /**
   * Fired when workbench stages a new candidate (sample load, undo, agent
   * stage). Shell uses this for lifecycle emission only.
   */
  readonly onWorkbenchStaged?: (change: PlaygroundSessionWorkbenchChange) => void;
}
export interface PlaygroundSession {
  readonly workbench: PlaygroundState;
  readonly agent: PlaygroundAgentState;
  readonly interactions: PlaygroundInteractions;
  readonly pendingInteractions: PlaygroundInteractions | null;
  readonly mockNotice: boolean;
  readonly rateLimitUntil: number | null;
  readonly rateLimitLabel: string;
  readonly shareUrl: string;
  readonly shareStatus: string;
  readonly busy: boolean;
  phaseLine(now?: number): string;

  loadSample(id: string): boolean;
  runAgent(
    userPrompt: string,
    dataset: PlaygroundDatasetId,
    options?: {
      readonly example?: PlaygroundExamplePrompt;
    },
  ): Promise<void>;
  cancel(): void;
  undo(): boolean;
  restoreFromHash(
    origin: PlaygroundHashRestoreOrigin,
    hash: string,
  ): PlaygroundSessionHashRestoreSideEffect;

  /** Candidate pipeline hooks used by PlaygroundPreview (still session-owned state). */
  promoteCandidate(generation: number): {
    readonly accepted: boolean;
    readonly origin: PlaygroundCandidateRef["origin"] | undefined;
    readonly workbench: PlaygroundState;
  };
  failCandidate(
    generation: number,
    diagnostic: PlaygroundDiagnostic,
  ): {
    readonly accepted: boolean;
    readonly origin: PlaygroundCandidateRef["origin"] | undefined;
    readonly workbench: PlaygroundState;
    readonly navigationRecovery: {
      readonly replaceHash: string | null;
      readonly preserveForward: true;
    } | null;
  };
  confirmRendered(): void;
  reportActiveFailed(diagnostic: PlaygroundDiagnostic, statusMessage: string): PlaygroundState;
  setInteractions(next: PlaygroundInteractions): void;
  setHistoryHash(hash: string): void;
  setShareResult(url: string, status: string): void;
  clearShare(): void;
  setShareStatus(status: string): void;
  tickNow(now: number): void;
}

export function createPlaygroundSession(options: PlaygroundSessionOptions): PlaygroundSession {
  const confirm = options.confirm ?? (() => true);
  const now = options.now ?? Date.now;
  const notify = (): void => {
    options.onChange?.();
  };

  let workbench = createPlaygroundState(options.initialSeed);
  let agent = createPlaygroundAgentState();
  let interactions = defaultPlaygroundInteractions();
  let pendingInteractions: PlaygroundInteractions | null = null;
  let pendingSuccess: PlaygroundAgentEnvelope | null = null;
  let mockNotice = false;
  let rateLimitUntil: number | null = null;
  let rateLimitLabel = "";
  let shareUrl = "";
  let shareStatus = "";
  let abortController: AbortController | null = null;
  // Monotonic run token: continuations from a superseded/cancelled pipeline
  // must never touch state after a newer run (or a sample load) began.
  let runSeq = 0;

  function cancelActiveRun(): void {
    runSeq += 1;
    abortController?.abort();
    abortController = null;
  }

  function stageAgentSeed(seed: PlaygroundSeedV1, nextInteractions: PlaygroundInteractions): void {
    const previous = workbenchCandidateRef(workbench);
    pendingInteractions = nextInteractions;
    workbench = stagePlaygroundSeed(workbench, seed, "agent");
    agent = setAgentDrawing(agent);
    options.onWorkbenchStaged?.({ previous, workbench });
    notify();
  }

  const session: PlaygroundSession = {
    get workbench() {
      return workbench;
    },
    get agent() {
      return agent;
    },
    get interactions() {
      return interactions;
    },
    get pendingInteractions() {
      return pendingInteractions;
    },
    get mockNotice() {
      return mockNotice;
    },
    get rateLimitUntil() {
      return rateLimitUntil;
    },
    get rateLimitLabel() {
      return rateLimitLabel;
    },
    get shareUrl() {
      return shareUrl;
    },
    get shareStatus() {
      return shareStatus;
    },
    get busy() {
      return agentIsBusy(agent);
    },
    phaseLine(at = now()) {
      const resolved = resolvePhaseLine(agent, at);
      if (resolved !== "") return resolved;
      return mockNotice ? "Instant sample — live generation isn't enabled yet." : "";
    },

    loadSample(id: string): boolean {
      let plan = planSampleLoad(workbench, id, options.samples, false);
      if (plan.kind === "noop") return false;
      if (plan.kind === "needs_confirm") {
        if (!confirm(PLAYGROUND_SAMPLE_DISCARD_CONFIRM)) return false;
        plan = planSampleLoad(workbench, id, options.samples, true);
        if (plan.kind !== "load") return false;
      }
      cancelActiveRun();
      const previous = plan.previous;
      workbench = plan.workbench;
      interactions = plan.interactions;
      pendingInteractions = plan.pendingInteractions;
      pendingSuccess = plan.pendingSuccess;
      mockNotice = plan.mockNotice;
      agent = plan.agent;
      options.onWorkbenchStaged?.({ previous, workbench });
      notify();
      return true;
    },

    async runAgent(userPrompt, dataset, runOptions = {}): Promise<void> {
      // Match shell: cancel prior pipeline, then claim a fresh run token.
      cancelActiveRun();
      const controller = new AbortController();
      abortController = controller;

      const token = ++runSeq;
      const isStale = (): boolean => token !== runSeq || controller.signal.aborted;

      // Clear before the run so a cancelled live generate cannot inherit
      // mock notice copy from a prior canned example.
      mockNotice = false;
      notify();

      const outcome = await runPlaygroundAgentRun(
        {
          userPrompt,
          dataset,
          getCurrentSpec: () => elidePlaygroundDatasetRows(workbench.committed, dataset),
          ...(runOptions.example === undefined ? {} : { example: runOptions.example }),
          signal: controller.signal,
          isStale,
          initialAgent: agent,
        },
        {
          onAgent: (next) => {
            if (isStale()) return;
            agent = next;
            notify();
          },
          generateChart: options.generateChart,
          ...(options.delay === undefined ? {} : { delay: options.delay }),
          now,
        },
      );

      if (outcome.kind === "stale") return;

      if (outcome.kind === "failed") {
        mockNotice = outcome.mockNotice;
        if (outcome.rateLimit !== undefined) {
          rateLimitUntil = outcome.rateLimit.until;
          rateLimitLabel = outcome.rateLimit.label;
        }
        notify();
        return;
      }

      mockNotice = outcome.mockNotice;
      pendingSuccess = outcome.pendingSuccess;
      stageAgentSeed(outcome.seed, outcome.interactions);
    },

    cancel(): void {
      cancelActiveRun();
      pendingSuccess = null;
      agent = failAgent(agent, {
        code: "aborted",
        message: messageForAgentError("aborted"),
      });
      notify();
    },

    undo(): boolean {
      let plan = planUndoChart(workbench, agentIsBusy(agent), false);
      if (plan.kind === "noop") return false;
      if (plan.kind === "needs_confirm") {
        if (!confirm(PLAYGROUND_UNDO_DISCARD_CONFIRM)) return false;
        plan = planUndoChart(workbench, agentIsBusy(agent), true);
        if (plan.kind !== "stage") return false;
      }
      const previous = plan.previous;
      workbench = plan.workbench;
      options.onWorkbenchStaged?.({ previous, workbench });
      notify();
      return true;
    },

    restoreFromHash(origin, hash): PlaygroundSessionHashRestoreSideEffect {
      const decision = resolvePlaygroundHashRestore(origin, hash, options.shareCatalogs);
      if (decision.kind === "noop") return { kind: "noop" };

      // History restore replaces the chart: cancel any in-flight agent run and
      // drop its pending payload so it can't apply to the restored chart.
      cancelActiveRun();
      pendingInteractions = null;
      pendingSuccess = null;
      if (agentIsBusy(agent)) agent = createPlaygroundAgentState();

      const previous = workbenchCandidateRef(workbench);
      const replaceWithHistoryHash = decision.kind === "reject" ? workbench.historyHash : null;
      const next = applyPlaygroundHashRestoreState(
        workbench,
        decision,
        origin,
        options.initialSeed,
      );
      workbench = next;

      let rejectCancel: {
        readonly generation: number;
        readonly origin: PlaygroundCandidateRef["origin"];
        readonly status: string;
      } | null = null;
      if (decision.kind === "reject") {
        const cancel = rejectRestoreCancelPhase(previous, workbench.status);
        if (cancel !== null) {
          rejectCancel = {
            generation: cancel.generation,
            origin: cancel.origin,
            status: cancel.status,
          };
        }
      }

      notify();
      return {
        kind: "applied",
        previous,
        workbench: next,
        replaceWithHistoryHash,
        rejectCancel,
      };
    },

    promoteCandidate(generation) {
      const current = workbench;
      const origin = current.candidate?.origin;
      const promoted = promotePlaygroundCandidate(current, generation);
      if (!candidateTransitionAccepted(current, promoted)) {
        return {
          accepted: false,
          origin: undefined,
          workbench: current,
        };
      }
      workbench = promoted;
      if (pendingInteractions !== null) {
        interactions = pendingInteractions;
        pendingInteractions = null;
      }
      if (origin === "agent" && pendingSuccess !== null) {
        agent = completeAgentSuccess(agent, pendingSuccess);
        pendingSuccess = null;
      }
      shareUrl = "";
      shareStatus = "";
      notify();
      return {
        accepted: true,
        origin,
        workbench: promoted,
      };
    },

    failCandidate(generation, diagnostic) {
      const current = workbench;
      const origin = current.candidate?.origin;
      const failed = failPlaygroundCandidate(current, generation, diagnostic);
      if (!candidateTransitionAccepted(current, failed)) {
        return {
          accepted: false,
          origin: undefined,
          workbench: current,
          navigationRecovery: null,
        };
      }
      workbench = failed;
      pendingInteractions = null;
      pendingSuccess = null;
      if (origin === "agent") {
        agent = failAgent(agent, {
          code: "pipeline",
          message: diagnostic.message,
        });
      }
      notify();
      return {
        accepted: true,
        origin,
        workbench: failed,
        navigationRecovery: failed.navigationRecovery,
      };
    },

    confirmRendered(): void {
      workbench = confirmPlaygroundRendered(workbench);
      notify();
    },

    reportActiveFailed(diagnostic, statusMessage) {
      workbench = reportPlaygroundDiagnostic(workbench, diagnostic, statusMessage, false);
      notify();
      return workbench;
    },

    setInteractions(next) {
      interactions = next;
      notify();
    },

    setHistoryHash(hash) {
      workbench = setPlaygroundHistoryHash(workbench, hash);
      notify();
    },

    setShareResult(url, status) {
      shareUrl = url;
      shareStatus = status;
      notify();
    },

    clearShare() {
      shareUrl = "";
      shareStatus = "";
      notify();
    },

    setShareStatus(status) {
      shareStatus = status;
      notify();
    },

    tickNow(at) {
      if (rateLimitUntil === null) return;
      const remaining = Math.ceil((rateLimitUntil - at) / 1000);
      if (remaining <= 0) {
        rateLimitUntil = null;
        rateLimitLabel = "";
      } else {
        rateLimitLabel = rateLimitLabelFor(remaining);
      }
      notify();
    },
  };

  return session;
}
