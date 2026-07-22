/**
 * Playground candidate lifecycle phases for deterministic test observation.
 *
 * Docs-app only (not a published package API). Tests listen for the
 * `ggsvelte:playground-candidate` CustomEvent; assistive technology uses
 * aria-busy / status live region, not this event.
 */
import type { PlaygroundCandidateOrigin } from "./playground-state";

export const PLAYGROUND_CANDIDATE_EVENT = "ggsvelte:playground-candidate";

export type PlaygroundCandidatePhase = "pending" | "ready" | "promoted" | "failed" | "cancelled";

export type PlaygroundCandidateTerminalPhase = "promoted" | "failed" | "cancelled";

export interface PlaygroundCandidateIsolation {
  readonly inert: boolean;
  readonly inertAttribute: boolean;
  readonly ariaHidden: string | null;
  readonly activeRetained: boolean;
  /** Active chart title at candidate ready — proves last-valid content is still painted. */
  readonly activeTitle: string | null;
}

export interface PlaygroundCandidatePhaseDetail {
  readonly generation: number;
  readonly origin: PlaygroundCandidateOrigin;
  readonly phase: PlaygroundCandidatePhase;
  readonly status: string;
  readonly isolation?: PlaygroundCandidateIsolation;
}

/** Tracks which generations have already reached a terminal phase. */
export interface PlaygroundCandidateLifecycleTracker {
  readonly terminalByGeneration: ReadonlyMap<number, PlaygroundCandidateTerminalPhase>;
  readonly readyGenerations: ReadonlySet<number>;
}

export function createCandidateLifecycleTracker(): PlaygroundCandidateLifecycleTracker {
  return {
    terminalByGeneration: new Map(),
    readyGenerations: new Set(),
  };
}

const TERMINAL: ReadonlySet<PlaygroundCandidatePhase> = new Set([
  "promoted",
  "failed",
  "cancelled",
]);

export function isTerminalPhase(
  phase: PlaygroundCandidatePhase,
): phase is PlaygroundCandidateTerminalPhase {
  return TERMINAL.has(phase);
}

/**
 * Decide whether a phase transition is allowed for a generation.
 * Returns null when the emission must be suppressed (stale / duplicate).
 */
export function acceptCandidatePhase(
  tracker: PlaygroundCandidateLifecycleTracker,
  detail: PlaygroundCandidatePhaseDetail,
): {
  readonly detail: PlaygroundCandidatePhaseDetail;
  readonly tracker: PlaygroundCandidateLifecycleTracker;
} | null {
  if (tracker.terminalByGeneration.has(detail.generation)) return null;

  if (detail.phase === "ready") {
    if (tracker.readyGenerations.has(detail.generation)) return null;
    const readyGenerations = new Set([...tracker.readyGenerations, detail.generation]);
    return {
      detail,
      tracker: { ...tracker, readyGenerations },
    };
  }

  if (isTerminalPhase(detail.phase)) {
    const terminalByGeneration = new Map([
      ...tracker.terminalByGeneration,
      [detail.generation, detail.phase],
    ]);
    return {
      detail,
      tracker: { ...tracker, terminalByGeneration },
    };
  }

  // pending: allow once per generation unless already past pending (ready or terminal)
  if (detail.phase === "pending") {
    if (tracker.readyGenerations.has(detail.generation)) return null;
    return { detail, tracker };
  }

  return null;
}

/**
 * Whether a promote/fail state transition was accepted by the pure state machine.
 * Callers must only emit terminal phases when this is true.
 */
export function candidateTransitionAccepted<T>(previous: T, next: T): boolean {
  return previous !== next;
}

export type PlaygroundCandidateRef = {
  readonly generation: number;
  readonly origin: PlaygroundCandidateOrigin;
};

/**
 * Pure phase notes for a workbench transition that may cancel a prior candidate
 * and/or stage a new one. Order is cancel-then-pending (matches Playground.svelte).
 */
export function phaseNotesForCandidateTransition(
  previous: PlaygroundCandidateRef | null,
  next: {
    readonly candidate: PlaygroundCandidateRef | null;
    readonly status: string;
  },
): readonly PlaygroundCandidatePhaseDetail[] {
  const notes: PlaygroundCandidatePhaseDetail[] = [];
  if (
    previous !== null &&
    (next.candidate === null || next.candidate.generation !== previous.generation)
  ) {
    notes.push({
      generation: previous.generation,
      origin: previous.origin,
      phase: "cancelled",
      status: next.status,
    });
  }
  if (next.candidate !== null) {
    notes.push({
      generation: next.candidate.generation,
      origin: next.candidate.origin,
      phase: "pending",
      status: next.status,
    });
  }
  return notes;
}

export function emitPlaygroundCandidatePhase(
  detail: PlaygroundCandidatePhaseDetail,
  target: EventTarget = globalThis,
): void {
  target.dispatchEvent(
    new CustomEvent(PLAYGROUND_CANDIDATE_EVENT, {
      detail,
    }),
  );
}

export function snapshotCandidateIsolation(
  candidateRoot: HTMLElement,
  activeChartRoot: ParentNode | null,
  retainedActiveProbe: Element | null = null,
): PlaygroundCandidateIsolation {
  const doc = candidateRoot.ownerDocument;
  const retentionHost =
    activeChartRoot instanceof Element ? activeChartRoot : doc.querySelector(".active-chart");
  const titleRoot = retentionHost instanceof Element ? retentionHost : doc;
  return {
    inert: candidateRoot.inert,
    inertAttribute: candidateRoot.hasAttribute("inert"),
    ariaHidden: candidateRoot.getAttribute("aria-hidden"),
    // Prefer object-identity probe (survives Svelte attribute reconciliation).
    // Fall back to the legacy data-attribute marker for callers that set it.
    activeRetained:
      (retainedActiveProbe !== null && retentionHost === retainedActiveProbe) ||
      (retentionHost instanceof Element &&
        (retentionHost.matches('[data-retained-during-candidate="true"]') ||
          retentionHost.querySelector('[data-retained-during-candidate="true"]') !== null)),
    activeTitle: titleRoot.querySelector(".gg-title")?.textContent ?? null,
  };
}
