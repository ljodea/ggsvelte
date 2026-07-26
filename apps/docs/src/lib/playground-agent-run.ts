/**
 * Agent generate → validate → optional one-shot repair orchestration.
 *
 * Extracted from Playground.svelte so the run can be unit-tested without the
 * Svelte shell. DOM, candidate lifecycle, and stagePlaygroundSeed stay in the
 * component: this module only drives the agent machine via `onAgent` and
 * returns a staging decision.
 *
 * Drawing phase is intentionally NOT set here — `stageAgentSeed` in the
 * component owns `setAgentDrawing` so lifecycle emits see a consistent phase.
 */

import type {
  GenerateChartOptions,
  GenerateChartRequest,
  GenerateChartResult,
} from "./playground-agent-client";
import type { PlaygroundAgentEnvelope, PlaygroundInteractions } from "./playground-agent-envelope";
import {
  beginAgentRequest,
  failAgent,
  messageForAgentError,
  setAgentRepairing,
  setAgentValidating,
  type PlaygroundAgentState,
} from "./playground-agent-state";
import { agentFailureIsRepairable, validateAgentEnvelope } from "./playground-agent-validate";
import type { PlaygroundSeedV1 } from "./playground-codec";
import type { PlaygroundDatasetId } from "./playground-dataset-schemas";
import type { PlaygroundExamplePrompt } from "./playground-prompts";

export function rateLimitLabelFor(seconds: number): string {
  return `Try again in ${seconds}s`;
}

export interface PlaygroundAgentRunInput {
  readonly userPrompt: string;
  readonly dataset: PlaygroundDatasetId;
  /**
   * Re-read the elided committed spec at first generate and again at repair
   * (matches the dual `elidePlaygroundDatasetRows(workbench.committed, …)`
   * calls that lived in the component).
   */
  readonly getCurrentSpec: () => unknown;
  readonly example?: PlaygroundExamplePrompt;
  readonly signal?: AbortSignal;
  /** True when this run was superseded (`runSeq`) or aborted. */
  readonly isStale: () => boolean;
  readonly initialAgent: PlaygroundAgentState;
}

export type PlaygroundAgentRunOutcome =
  | { readonly kind: "stale" }
  | {
      readonly kind: "failed";
      readonly mockNotice: boolean;
      readonly rateLimit?: { readonly until: number; readonly label: string };
    }
  | {
      readonly kind: "ready_to_stage";
      readonly mockNotice: boolean;
      readonly seed: PlaygroundSeedV1;
      readonly interactions: PlaygroundInteractions;
      readonly pendingSuccess: PlaygroundAgentEnvelope;
    };

export interface PlaygroundAgentRunDeps {
  readonly onAgent: (agent: PlaygroundAgentState) => void;
  readonly generateChart: (
    req: GenerateChartRequest,
    opts?: GenerateChartOptions,
  ) => Promise<GenerateChartResult>;
  readonly delay?: (ms: number) => Promise<void>;
  readonly now?: () => number;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Run one agent attempt. Intermediate agent phases are pushed through
 * `deps.onAgent` only — the outcome never carries `agent`, so the component
 * cannot clobber `setAgentDrawing` after staging.
 */
export async function runPlaygroundAgentRun(
  input: PlaygroundAgentRunInput,
  deps: PlaygroundAgentRunDeps,
): Promise<PlaygroundAgentRunOutcome> {
  const delay = deps.delay ?? defaultDelay;
  const now = deps.now ?? Date.now;
  const { onAgent, generateChart } = deps;
  const { isStale, signal } = input;

  let agent = beginAgentRequest(input.initialAgent, {
    exampleMode: input.example !== undefined,
    now: now(),
  });
  onAgent(agent);

  let mockNotice = false;

  try {
    let rawEnvelope: unknown;
    let envelope: PlaygroundAgentEnvelope;

    const example = input.example;
    if (example === undefined) {
      const first = await generateChart(
        {
          prompt: input.userPrompt,
          datasetId: input.dataset,
          currentSpec: input.getCurrentSpec(),
        },
        signal === undefined ? undefined : { signal },
      );
      if (isStale()) return { kind: "stale" };
      if (!first.ok) {
        let rateLimit: { readonly until: number; readonly label: string } | undefined;
        if (first.code === "rate_limited" || first.code === "upstream_rate_limited") {
          const seconds = first.retryAfterSeconds ?? 60;
          rateLimit = {
            until: now() + seconds * 1000,
            label: rateLimitLabelFor(seconds),
          };
        }
        agent = failAgent(agent, {
          code: first.code,
          message: first.message,
          ...(first.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: first.retryAfterSeconds }),
        });
        onAgent(agent);
        return rateLimit === undefined
          ? { kind: "failed", mockNotice }
          : { kind: "failed", mockNotice, rateLimit };
      }
      if (first.model === "mock") mockNotice = true;
      envelope = first.envelope;
      rawEnvelope = first.rawEnvelope;
    } else {
      // Instant canned path (OV2-A) — brief phase line, then validate/stage.
      await delay(120);
      if (isStale()) return { kind: "stale" };
      envelope = example.envelope;
      rawEnvelope = {
        spec: envelope.spec,
        interactions: envelope.interactions,
        title: envelope.title,
      };
    }

    agent = setAgentValidating(agent);
    onAgent(agent);
    let validated = validateAgentEnvelope(envelope, input.dataset);

    // One repair round, and only with raw SpecError[] to repair from: a
    // seed-bound failure carries none, so repairing would spend a second
    // model call and double the wait for nothing (#697).
    if (input.example === undefined && agentFailureIsRepairable(validated)) {
      agent = setAgentRepairing(agent);
      onAgent(agent);
      const repair = await generateChart(
        {
          prompt: input.userPrompt,
          datasetId: input.dataset,
          currentSpec: input.getCurrentSpec(),
          priorSpec: rawEnvelope,
          priorErrors: validated.errors,
        },
        signal === undefined ? undefined : { signal },
      );
      if (isStale()) return { kind: "stale" };
      if (!repair.ok) {
        // Repair rate_limited deliberately does NOT set rate-limit UX —
        // only the first generate attempt drives the countdown (preserve).
        agent = failAgent(agent, {
          code: repair.code,
          message: repair.message,
          details: validated.errors,
        });
        onAgent(agent);
        return { kind: "failed", mockNotice };
      }
      envelope = repair.envelope;
      rawEnvelope = repair.rawEnvelope;
      validated = validateAgentEnvelope(envelope, input.dataset);
    }

    if (!validated.ok) {
      agent = failAgent(agent, {
        code: "validation",
        message: validated.message,
        details: validated.errors,
      });
      onAgent(agent);
      return { kind: "failed", mockNotice };
    }

    if (isStale()) return { kind: "stale" };
    // Success completes on candidate promotion (the "Drawing…" phase is
    // real; Generate stays disabled until the chart actually paints).
    // Agent remains validating | repairing — stageAgentSeed sets drawing.
    return {
      kind: "ready_to_stage",
      mockNotice,
      seed: validated.seed,
      interactions: validated.interactions,
      pendingSuccess: {
        spec: validated.spec,
        interactions: validated.interactions,
        title: validated.title,
      },
    };
  } catch (error) {
    // A throw must never strand the machine in a busy phase.
    if (isStale()) return { kind: "stale" };
    agent = failAgent(agent, {
      code: "pipeline",
      message: messageForAgentError("pipeline", error instanceof Error ? error.message : undefined),
    });
    onAgent(agent);
    return { kind: "failed", mockNotice };
  }
}
