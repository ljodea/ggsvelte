<script lang="ts">
  import { pushState as pushSvelteKitState } from "$app/navigation";
  import { onMount, tick } from "svelte";

  import type { RenderModel } from "@ggsvelte/core";

  import { copyText, MANUAL_LINK_COPY_STATUS } from "$lib/clipboard";
  import PlaygroundEditor from "$lib/components/PlaygroundEditor.svelte";
  import PlaygroundEvents from "$lib/components/PlaygroundEvents.svelte";
  import PlaygroundOutput from "$lib/components/PlaygroundOutput.svelte";
  import PlaygroundPreview from "$lib/components/PlaygroundPreview.svelte";
  import PlaygroundShell from "$lib/components/PlaygroundShell.svelte";
  import UiButton from "$lib/components/UiButton.svelte";
  import {
    PLAYGROUND_EXAMPLES,
    PLAYGROUND_SAMPLES,
  } from "$lib/generated/playground-seeds";
  import {
    acceptCandidatePhase,
    candidateTransitionAccepted,
    createCandidateLifecycleTracker,
    emitPlaygroundCandidatePhase,
    phaseNotesForCandidateTransition,
    type PlaygroundCandidateIsolation,
    type PlaygroundCandidatePhaseDetail,
    type PlaygroundCandidateRef,
  } from "$lib/playground-candidate-lifecycle";
  import {
    appendPlaygroundEvent,
    type PlaygroundEventEntry,
    type PlaygroundInteractionEvent,
  } from "$lib/playground-events";
  import {
    decodePlaygroundHash,
    encodePlaygroundSeed,
    type PlaygroundSeedV1,
  } from "$lib/playground-codec";
  import {
    sharedLinkRejectDiagnostic,
    shouldClearPlayHashAfterPromotion,
    shouldConfirmDiscardForSampleLoad,
    shouldConfirmDiscardForUndo,
    verifiedSharedSeed,
  } from "$lib/playground-link-policy";
  import { playgroundOutputs } from "$lib/playground-output";
  import {
    confirmPlaygroundRendered,
    createPlaygroundState,
    editPlaygroundDraft,
    failPlaygroundCandidate,
    promotePlaygroundCandidate,
    reportPlaygroundDiagnostic,
    resetPlaygroundSource,
    setPlaygroundHistoryHash,
    stagePlaygroundDraft,
    stagePlaygroundSeed,
    stagePlaygroundUndo,
    type PlaygroundDiagnostic,
  } from "$lib/playground-state";
  const initialSample = PLAYGROUND_SAMPLES[0]!;
  const initialSeed: PlaygroundSeedV1 = initialSample.seed;
  const shareCatalogs = {
    examples: PLAYGROUND_EXAMPLES,
    samples: PLAYGROUND_SAMPLES,
  };

  let workbench = $state(createPlaygroundState(initialSeed));
  let shareUrl = $state("");
  let shareStatus = $state("");
  let shareSource = $state<HTMLElement>();
  let events = $state<readonly PlaygroundEventEntry[]>([]);
  let lifecycleTracker = $state(createCandidateLifecycleTracker());

  function noteCandidatePhase(detail: PlaygroundCandidatePhaseDetail): void {
    const accepted = acceptCandidatePhase(lifecycleTracker, detail);
    if (accepted === null) return;
    lifecycleTracker = accepted.tracker;
    emitPlaygroundCandidatePhase(accepted.detail);
  }

  function noteStagedCandidate(
    previous: PlaygroundCandidateRef | null,
    next: typeof workbench,
  ): void {
    for (const detail of phaseNotesForCandidateTransition(previous, {
      candidate: next.candidate,
      status: next.status,
    })) {
      noteCandidatePhase(detail);
    }
  }

  function activeCandidate(): PlaygroundCandidateRef | null {
    const candidate = workbench.candidate;
    return candidate === null
      ? null
      : { generation: candidate.generation, origin: candidate.origin };
  }

  const outputs = $derived(playgroundOutputs(workbench.committed));
  const selectedSample = $derived(
    workbench.seed.source.kind === "sample" ? workbench.seed.source.id : "",
  );

  function replaceLocationHash(hash: string | null): void {
    const url = new URL(window.location.href);
    url.hash = hash ?? "";
    history.replaceState(history.state, "", url);
  }

  function restoreLocation(origin: "initial-navigation" | "popstate"): void {
    const decoded = decodePlaygroundHash(window.location.hash);
    if (decoded.status === "absent") {
      if (origin === "popstate") {
        const previous = activeCandidate();
        const next = stagePlaygroundSeed(workbench, initialSeed, origin, null);
        workbench = next;
        noteStagedCandidate(previous, next);
      }
      return;
    }
    if (decoded.status === "error") {
      replaceLocationHash(workbench.historyHash);
      const previous = activeCandidate();
      workbench = reportPlaygroundDiagnostic(
        workbench,
        sharedLinkRejectDiagnostic(decoded.error),
        "The shared link was rejected. The current local chart and a truthful URL were retained.",
      );
      if (previous !== null) {
        noteCandidatePhase({
          generation: previous.generation,
          origin: previous.origin,
          phase: "cancelled",
          status: workbench.status,
        });
      }
      return;
    }
    const previous = activeCandidate();
    const next = stagePlaygroundSeed(
      workbench,
      verifiedSharedSeed(window.location.hash, decoded.seed, shareCatalogs),
      origin,
      window.location.hash,
    );
    workbench = next;
    noteStagedCandidate(previous, next);
  }

  onMount(() => {
    restoreLocation("initial-navigation");
    const onPopState = () => restoreLocation("popstate");
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  });

  function editDraft(draft: string): void {
    const previous = activeCandidate();
    const edited = editPlaygroundDraft(workbench, draft);
    workbench = edited;
    for (const detail of phaseNotesForCandidateTransition(previous, {
      candidate: edited.candidate,
      status: edited.status,
    })) {
      noteCandidatePhase(detail);
    }
    if (!edited.synchronized) {
      shareUrl = "";
      shareStatus = "";
    }
  }

  function applyDraft(): void {
    const previous = activeCandidate();
    const next = stagePlaygroundDraft(workbench);
    workbench = next;
    noteStagedCandidate(previous, next);
  }

  function resetSource(): void {
    const previous = activeCandidate();
    const next = resetPlaygroundSource(workbench);
    workbench = next;
    noteStagedCandidate(previous, next);
  }

  function undoChart(): void {
    if (workbench.undoSnapshots.length === 0 || workbench.candidate !== null)
      return;
    if (shouldConfirmDiscardForUndo(workbench)) {
      const discard = window.confirm(
        "Discard the current draft and undo to the previous rendered chart? Copy it first if you need to keep it.",
      );
      if (!discard) return;
    }
    const previous = activeCandidate();
    const next = stagePlaygroundUndo(workbench);
    workbench = next;
    noteStagedCandidate(previous, next);
  }

  function loadSample(id: string): boolean {
    if (id === "") return false;
    if (shouldConfirmDiscardForSampleLoad(workbench)) {
      const discard = window.confirm(
        "Discard the current draft and load this sample? Copy it first if you need to keep it.",
      );
      if (!discard) return false;
    }
    const sample = PLAYGROUND_SAMPLES.find((entry) => entry.id === id);
    if (sample === undefined) return false;
    const previous = activeCandidate();
    const next = stagePlaygroundSeed(workbench, sample.seed, "source");
    workbench = next;
    noteStagedCandidate(previous, next);
    return true;
  }

  function candidateReady(
    generation: number,
    isolation: PlaygroundCandidateIsolation,
  ): void {
    const current = workbench;
    const candidate = current.candidate;
    if (candidate?.generation !== generation) return;
    noteCandidatePhase({
      generation,
      origin: candidate.origin,
      phase: "ready",
      status: current.status,
      isolation,
    });
    // Microtask boundary: avoid re-entrant Svelte updates from GGPlot onrender.
    queueMicrotask(() => {
      promoteAcceptedCandidate(generation);
    });
  }

  function promoteAcceptedCandidate(generation: number): void {
    const current = workbench;
    const origin = current.candidate?.origin;
    const promoted = promotePlaygroundCandidate(current, generation);
    if (!candidateTransitionAccepted(current, promoted)) return;
    workbench = promoted;
    noteCandidatePhase({
      generation,
      origin: origin ?? "apply",
      phase: "promoted",
      status: promoted.status,
    });
    events = [];
    if (shouldClearPlayHashAfterPromotion(origin, window.location.hash)) {
      replaceLocationHash(null);
    }
    shareUrl = "";
    shareStatus = "";
  }

  function reconcileCandidateFailure(
    generation: number,
    diagnostic: PlaygroundDiagnostic,
  ): void {
    const current = workbench;
    const origin = current.candidate?.origin;
    const failed = failPlaygroundCandidate(current, generation, diagnostic);
    if (!candidateTransitionAccepted(current, failed)) return;
    workbench = failed;
    noteCandidatePhase({
      generation,
      origin: origin ?? "apply",
      phase: "failed",
      status: failed.status,
    });
    if (failed.navigationRecovery !== null) {
      replaceLocationHash(failed.navigationRecovery.replaceHash);
    }
  }

  function activeRendered(_model: RenderModel): void {
    workbench = confirmPlaygroundRendered(workbench);
  }

  function recordInteraction(event: PlaygroundInteractionEvent): void {
    events = appendPlaygroundEvent(events, event);
  }

  function activeFailed(diagnostic: PlaygroundDiagnostic): void {
    const previous = activeCandidate();
    workbench = reportPlaygroundDiagnostic(
      workbench,
      diagnostic,
      "The current chart stopped safely. Reset the source to recover.",
      false,
    );
    for (const detail of phaseNotesForCandidateTransition(previous, {
      candidate: null,
      status: workbench.status,
    })) {
      noteCandidatePhase(detail);
    }
  }

  async function share(): Promise<void> {
    if (!workbench.canCopyOrShare) return;
    const hash = encodePlaygroundSeed(workbench.seed);
    const url = new URL(window.location.href);
    url.hash = hash;
    pushSvelteKitState(url, {});
    workbench = setPlaygroundHistoryHash(workbench, hash);
    shareUrl = url.href;
    await tick();
    if (shareSource === undefined) return;
    const result = await copyText(shareUrl, shareSource);
    shareStatus =
      result === "copied" ? "Share link copied." : MANUAL_LINK_COPY_STATUS;
  }
</script>

<section class="playground" aria-labelledby="playground-heading">
  <header class="playground-intro">
    <h1 id="playground-heading">Playground</h1>
    <UiButton
      type="button"
      variant="primary"
      onclick={share}
      disabled={!workbench.canCopyOrShare}
    >
      Share this chart
    </UiButton>
  </header>

  {#if shareUrl !== ""}
    <div class="share-result">
      <code bind:this={shareSource}>{shareUrl}</code>
      <p role="status" aria-live="polite">{shareStatus}</p>
    </div>
  {/if}

  <PlaygroundShell>
    {#snippet preview()}
      <PlaygroundPreview
        rendered={workbench.rendered}
        candidate={workbench.candidate}
        lastValid={workbench.lastValid}
        status={workbench.status}
        onCandidateReady={candidateReady}
        onCandidateFailed={reconcileCandidateFailure}
        onActiveRendered={activeRendered}
        onActiveFailed={activeFailed}
        onInteraction={recordInteraction}
      />
    {/snippet}
    {#snippet editor()}
      <PlaygroundEditor
        draft={workbench.draft}
        samples={PLAYGROUND_SAMPLES}
        {selectedSample}
        diagnostics={workbench.diagnostics}
        pending={workbench.candidate !== null}
        canUndo={workbench.undoSnapshots.length > 0}
        onEdit={editDraft}
        onApply={applyDraft}
        onUndo={undoChart}
        onReset={resetSource}
        onLoadSample={loadSample}
      />
    {/snippet}
    {#snippet output()}
      <PlaygroundOutput
        {outputs}
        rendered={workbench.rendered}
        enabled={workbench.canCopyOrShare}
      />
      <PlaygroundEvents entries={events} onClear={() => (events = [])} />
    {/snippet}
  </PlaygroundShell>
</section>

<style>
  .playground {
    width: min(100% - 2rem, 96rem);
    margin: 0 auto;
    padding-block: 1rem 2rem;
  }

  .playground-intro {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.35rem, 2.4vw, 1.75rem);
    line-height: 1.15;
    letter-spacing: -0.03em;
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
    font-size: 0.78rem;
  }

  @media (max-width: 47.99rem) {
    .playground {
      width: min(100% - 1.25rem, 96rem);
      padding-block: 0.75rem 1.5rem;
    }

    .share-result {
      grid-template-columns: 1fr;
    }
  }
</style>
