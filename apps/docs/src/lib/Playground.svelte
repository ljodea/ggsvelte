<script lang="ts">
  import { pushState as pushSvelteKitState } from "$app/navigation";
  import { onMount, tick } from "svelte";

  import type { RenderModel } from "@ggsvelte/core";

  import { copyText } from "$lib/clipboard";
  import PlaygroundBrowseLinks from "$lib/components/PlaygroundBrowseLinks.svelte";
  import PlaygroundCode from "$lib/components/PlaygroundCode.svelte";
  import PlaygroundEvents from "$lib/components/PlaygroundEvents.svelte";
  import PlaygroundPreview from "$lib/components/PlaygroundPreview.svelte";
  import PlaygroundPrompt from "$lib/components/PlaygroundPrompt.svelte";
  import {
    PLAYGROUND_SAMPLES,
    PLAYGROUND_EXAMPLES,
  } from "$lib/generated/playground-seeds";
  import {
    acceptCandidatePhase,
    createCandidateLifecycleTracker,
    emitPlaygroundCandidatePhase,
    phaseNotesForCandidateTransition,
    type PlaygroundCandidateIsolation,
    type PlaygroundCandidatePhaseDetail,
  } from "$lib/playground-candidate-lifecycle";
  import {
    appendPlaygroundEvent,
    type PlaygroundEventEntry,
    type PlaygroundInteractionEvent,
  } from "$lib/playground-events";
  import {
    encodePlaygroundSeed,
    type PlaygroundSeedV1,
  } from "$lib/playground-codec";
  import {
    PLAYGROUND_ACTIVE_FAILED_STATUS,
    shouldClearPlayHashAfterPromotion,
  } from "$lib/playground-link-policy";
  import { playgroundOutputs } from "$lib/playground-output";
  import { playgroundShareCopyStatus } from "$lib/playground-output-status";
  import type {
    PlaygroundDiagnostic,
    PlaygroundState,
  } from "$lib/playground-state";
  import { generateChart } from "$lib/playground-agent-client";
  import { agentHandoffPrompt } from "$lib/playground-agent-handoff";
  import { createPlaygroundSession } from "$lib/playground-session";
  import type { PlaygroundDatasetId } from "$lib/playground-dataset-schemas";
  import {
    PLAYGROUND_DEFAULT_DATASET,
    PLAYGROUND_DEFAULT_PROMPT,
    type PlaygroundExamplePrompt,
  } from "$lib/playground-prompts";

  const initialSample = PLAYGROUND_SAMPLES[0]!;
  const initialSeed: PlaygroundSeedV1 = initialSample.seed;
  const shareCatalogs = {
    examples: PLAYGROUND_EXAMPLES,
    samples: PLAYGROUND_SAMPLES,
  };

  // Revision bridge: session owns mutable state; Svelte re-reads via $derived.
  let sessionRev = $state(0);
  let lifecycleTracker = $state(createCandidateLifecycleTracker());

  function noteCandidatePhase(detail: PlaygroundCandidatePhaseDetail): void {
    const accepted = acceptCandidatePhase(lifecycleTracker, detail);
    if (accepted === null) return;
    lifecycleTracker = accepted.tracker;
    emitPlaygroundCandidatePhase(accepted.detail);
  }

  function noteStagedCandidate(
    previous: {
      readonly generation: number;
      readonly origin: PlaygroundCandidatePhaseDetail["origin"];
    } | null,
    next: PlaygroundState,
  ): void {
    for (const detail of phaseNotesForCandidateTransition(previous, {
      candidate: next.candidate,
      status: next.status,
    })) {
      noteCandidatePhase(detail);
    }
  }

  const session = createPlaygroundSession({
    initialSeed,
    samples: PLAYGROUND_SAMPLES,
    shareCatalogs,
    generateChart,
    confirm: (message) => window.confirm(message),
    onChange: () => {
      sessionRev += 1;
    },
    onWorkbenchStaged: ({ previous, workbench: next }) => {
      noteStagedCandidate(previous, next);
    },
  });

  // UI-only state (not race-sensitive coordination).
  let prompt = $state(PLAYGROUND_DEFAULT_PROMPT);
  let datasetId = $state<PlaygroundDatasetId>(PLAYGROUND_DEFAULT_DATASET);
  let shareSource = $state<HTMLElement>();
  let events = $state<readonly PlaygroundEventEntry[]>([]);
  let nowTick = $state(Date.now());

  const workbench = $derived.by(() => {
    void sessionRev;
    return session.workbench;
  });
  const agent = $derived.by(() => {
    void sessionRev;
    return session.agent;
  });
  const interactions = $derived.by(() => {
    void sessionRev;
    return session.interactions;
  });
  const shareUrl = $derived.by(() => {
    void sessionRev;
    return session.shareUrl;
  });
  const shareStatus = $derived.by(() => {
    void sessionRev;
    return session.shareStatus;
  });
  const rateLimitUntil = $derived.by(() => {
    void sessionRev;
    return session.rateLimitUntil;
  });
  const rateLimitLabel = $derived.by(() => {
    void sessionRev;
    return session.rateLimitLabel;
  });
  const busy = $derived.by(() => {
    void sessionRev;
    return session.busy;
  });
  const phaseLine = $derived.by(() => {
    void sessionRev;
    return session.phaseLine(nowTick);
  });

  const outputs = $derived(
    playgroundOutputs(workbench.committed, interactions, datasetId),
  );
  const sampleLinks = $derived(
    PLAYGROUND_SAMPLES.map((s) => ({ id: s.id, title: s.title })),
  );
  const generateLabel = $derived(
    rateLimitLabel === "" ? "Generate" : rateLimitLabel,
  );
  const generateDisabled = $derived(
    rateLimitUntil !== null && nowTick < rateLimitUntil,
  );

  // Computed lazily at copy time — the ~10KB prompt assembly must not run
  // on every keystroke (performance review).
  function currentHandoffText(): string {
    return agentHandoffPrompt({
      currentSpec: session.workbench.committed,
      userGoal: prompt,
    });
  }

  function replaceLocationHash(hash: string | null): void {
    const url = new URL(window.location.href);
    url.hash = hash ?? "";
    history.replaceState(history.state, "", url);
  }

  function restoreLocation(origin: "initial-navigation" | "popstate"): void {
    const side = session.restoreFromHash(origin, window.location.hash);
    if (side.kind === "noop") return;
    if (side.replaceWithHistoryHash !== null) {
      replaceLocationHash(side.replaceWithHistoryHash);
    }
    if (side.rejectCancel !== null) {
      noteCandidatePhase({
        generation: side.rejectCancel.generation,
        origin: side.rejectCancel.origin,
        phase: "cancelled",
        status: side.rejectCancel.status,
      });
      return;
    }
    noteStagedCandidate(side.previous, side.workbench);
  }

  function onPopState(): void {
    restoreLocation("popstate");
  }

  onMount(() => {
    restoreLocation("initial-navigation");
  });

  // Tick only while there is something to tick for (escalated wait copy or a
  // rate-limit countdown) — no idle wakeups (performance review).
  $effect(() => {
    if (!busy && rateLimitUntil === null) return;
    const id = window.setInterval(() => {
      nowTick = Date.now();
      session.tickNow(nowTick);
    }, 500);
    return () => window.clearInterval(id);
  });

  function undoChart(): void {
    session.undo();
  }

  function loadSample(id: string): boolean {
    return session.loadSample(id);
  }

  function onGenerate(): void {
    if (busy || generateDisabled) return;
    if (prompt.trim() === "") return;
    void session.runAgent(prompt, datasetId);
  }

  function onExample(example: PlaygroundExamplePrompt): void {
    if (busy) return;
    prompt = example.prompt;
    datasetId = example.datasetId;
    void session.runAgent(example.prompt, example.datasetId, { example });
  }

  function onCancel(): void {
    session.cancel();
  }

  async function onCopyHandoff(): Promise<void> {
    await tick();
    // Prefer a transient element for clipboard binding.
    const el = document.createElement("button");
    document.body.append(el);
    try {
      await copyText(currentHandoffText(), el);
    } finally {
      el.remove();
    }
  }

  function candidateReady(
    generation: number,
    isolation: PlaygroundCandidateIsolation,
  ): void {
    const current = session.workbench;
    const candidate = current.candidate;
    if (candidate?.generation !== generation) return;
    noteCandidatePhase({
      generation,
      origin: candidate.origin,
      phase: "ready",
      status: current.status,
      isolation,
    });
    queueMicrotask(() => {
      promoteAcceptedCandidate(generation);
    });
  }

  function promoteAcceptedCandidate(generation: number): void {
    const result = session.promoteCandidate(generation);
    if (!result.accepted) return;
    noteCandidatePhase({
      generation,
      origin: result.origin ?? "agent",
      phase: "promoted",
      status: result.workbench.status,
    });
    events = [];
    if (
      shouldClearPlayHashAfterPromotion(result.origin, window.location.hash)
    ) {
      replaceLocationHash(null);
    }
  }

  function reconcileCandidateFailure(
    generation: number,
    diagnostic: PlaygroundDiagnostic,
  ): void {
    const result = session.failCandidate(generation, diagnostic);
    if (!result.accepted) return;
    noteCandidatePhase({
      generation,
      origin: result.origin ?? "agent",
      phase: "failed",
      status: result.workbench.status,
    });
    if (result.navigationRecovery !== null) {
      replaceLocationHash(result.navigationRecovery.replaceHash ?? null);
    }
  }

  function activeRendered(_model: RenderModel): void {
    session.confirmRendered();
  }

  function recordInteraction(event: PlaygroundInteractionEvent): void {
    events = appendPlaygroundEvent(events, event);
  }

  function activeFailed(diagnostic: PlaygroundDiagnostic): void {
    const previous =
      session.workbench.candidate === null
        ? null
        : {
            generation: session.workbench.candidate.generation,
            origin: session.workbench.candidate.origin,
          };
    const next = session.reportActiveFailed(
      diagnostic,
      PLAYGROUND_ACTIVE_FAILED_STATUS,
    );
    for (const detail of phaseNotesForCandidateTransition(previous, {
      candidate: null,
      status: next.status,
    })) {
      noteCandidatePhase(detail);
    }
  }

  async function share(): Promise<void> {
    if (!session.workbench.canCopyOrShare) return;
    const hash = encodePlaygroundSeed(session.workbench.seed);
    const url = new URL(window.location.href);
    url.hash = hash;
    pushSvelteKitState(url, {});
    session.setHistoryHash(hash);
    session.setShareResult(url.href, "");
    await tick();
    if (shareSource === undefined) {
      // PlaygroundCode triggers share; status via shareStatus only.
      session.setShareStatus(
        playgroundShareCopyStatus(
          await copyText(session.shareUrl, document.body),
        ),
      );
      return;
    }
    const result = await copyText(session.shareUrl, shareSource);
    session.setShareStatus(playgroundShareCopyStatus(result));
  }
</script>

<svelte:window onpopstate={onPopState} />

<section class="playground" aria-labelledby="playground-heading">
  <header class="playground-intro">
    <p class="eyebrow">Try it</p>
    <h1 id="playground-heading">Playground</h1>
    <p class="pitch">
      Ask for a chart in plain language. ggsvelte is agent-first — the JSON spec
      is how models create interactive charts on demand.
    </p>
  </header>

  <PlaygroundPrompt
    bind:prompt
    bind:datasetId
    {phaseLine}
    failure={agent.phase === "failed" ? agent.failure : null}
    {busy}
    {generateDisabled}
    {generateLabel}
    samples={sampleLinks}
    {onGenerate}
    {onCancel}
    onLoadSample={(id) => {
      loadSample(id);
    }}
    {onCopyHandoff}
  />

  <PlaygroundPreview
    rendered={workbench.rendered}
    candidate={workbench.candidate}
    lastValid={workbench.lastValid}
    status={workbench.status}
    {interactions}
    onInteractionsChange={(next) => {
      session.setInteractions(next);
    }}
    onCandidateReady={candidateReady}
    onCandidateFailed={reconcileCandidateFailure}
    onActiveRendered={activeRendered}
    onActiveFailed={activeFailed}
    onInteraction={recordInteraction}
    canUndo={workbench.undoSnapshots.length > 0}
    undoDisabled={busy || workbench.candidate !== null}
    onUndo={undoChart}
  />

  <PlaygroundBrowseLinks
    samples={sampleLinks}
    {busy}
    {onExample}
    onLoadSample={(id) => {
      loadSample(id);
    }}
  />

  <PlaygroundCode
    {outputs}
    rendered={workbench.rendered}
    enabled={workbench.canCopyOrShare}
    getHandoffText={currentHandoffText}
    onShare={share}
    {shareStatus}
  />

  {#if shareUrl !== ""}
    <div class="share-result">
      <code bind:this={shareSource}>{shareUrl}</code>
      <p role="status" aria-live="polite">{shareStatus}</p>
    </div>
  {/if}

  <PlaygroundEvents entries={events} onClear={() => (events = [])} />
</section>

<style>
  .playground {
    width: min(100% - 2rem, 72rem);
    margin: 0 auto;
    padding-block: 1rem 2.5rem;
  }

  /* Playground spec: max 4px radius, no decorative shadow (DESIGN.md). */
  .playground :global(.ui-button) {
    border-radius: 4px;
    box-shadow: none;
  }

  .playground-intro {
    margin-bottom: 1.5rem;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    color: var(--accent);
    font: 700 0.75rem/1 var(--body-font);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.5rem, 2.8vw, 2rem);
    line-height: 1.15;
    letter-spacing: -0.03em;
  }

  .pitch {
    margin: 0.65rem 0 0;
    max-width: 40rem;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.5;
  }

  .share-result {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    margin-top: 0.75rem;
    border-block: 1px solid var(--line);
    padding-block: 0.65rem;
  }

  .share-result code {
    min-width: 0;
    overflow-x: auto;
    white-space: nowrap;
  }

  .share-result p {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
  }

  @media (max-width: 44.99rem) {
    .playground {
      width: min(100% - 1.25rem, 72rem);
    }

    .share-result {
      grid-template-columns: 1fr;
    }
  }
</style>
