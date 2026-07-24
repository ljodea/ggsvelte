<script lang="ts">
  import { pushState as pushSvelteKitState } from "$app/navigation";
  import { onMount, tick } from "svelte";

  import type { RenderModel } from "@ggsvelte/core";
  import type { SpecError } from "@ggsvelte/spec";

  import { copyText } from "$lib/clipboard";
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
    encodePlaygroundSeed,
    type PlaygroundSeedV1,
  } from "$lib/playground-codec";
  import {
    applyPlaygroundHashRestoreState,
    rejectRestoreCancelPhase,
    resolvePlaygroundHashRestore,
  } from "$lib/playground-hash-restore";
  import {
    PLAYGROUND_ACTIVE_FAILED_STATUS,
    PLAYGROUND_SAMPLE_DISCARD_CONFIRM,
    PLAYGROUND_UNDO_DISCARD_CONFIRM,
    shouldClearPlayHashAfterPromotion,
    shouldConfirmDiscardForSampleLoad,
    shouldConfirmDiscardForUndo,
  } from "$lib/playground-link-policy";
  import { playgroundOutputs } from "$lib/playground-output";
  import { playgroundShareCopyStatus } from "$lib/playground-output-status";
  import {
    confirmPlaygroundRendered,
    createPlaygroundState,
    failPlaygroundCandidate,
    promotePlaygroundCandidate,
    reportPlaygroundDiagnostic,
    setPlaygroundHistoryHash,
    stagePlaygroundSeed,
    stagePlaygroundUndo,
    type PlaygroundDiagnostic,
  } from "$lib/playground-state";
  import {
    defaultPlaygroundInteractions,
    type PlaygroundAgentEnvelope,
    type PlaygroundInteractions,
  } from "$lib/playground-agent-envelope";
  import { generateChart } from "$lib/playground-agent-client";
  import { agentHandoffPrompt } from "$lib/playground-agent-handoff";
  import {
    agentIsBusy,
    beginAgentRequest,
    completeAgentSuccess,
    createPlaygroundAgentState,
    failAgent,
    messageForAgentError,
    resolvePhaseLine,
    setAgentDrawing,
    setAgentRepairing,
    setAgentValidating,
    type PlaygroundAgentState,
  } from "$lib/playground-agent-state";
  import { validateAgentEnvelope } from "$lib/playground-agent-validate";
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

  let workbench = $state(createPlaygroundState(initialSeed));
  let agent = $state<PlaygroundAgentState>(createPlaygroundAgentState());
  let interactions = $state<PlaygroundInteractions>(
    defaultPlaygroundInteractions(),
  );
  let pendingInteractions = $state<PlaygroundInteractions | null>(null);
  let prompt = $state(PLAYGROUND_DEFAULT_PROMPT);
  let datasetId = $state<PlaygroundDatasetId>(PLAYGROUND_DEFAULT_DATASET);
  let shareUrl = $state("");
  let shareStatus = $state("");
  let shareSource = $state<HTMLElement>();
  let events = $state<readonly PlaygroundEventEntry[]>([]);
  let lifecycleTracker = $state(createCandidateLifecycleTracker());
  let abortController = $state<AbortController | null>(null);
  let rateLimitUntil = $state<number | null>(null);
  let rateLimitLabel = $state("");
  let nowTick = $state(Date.now());

  const outputs = $derived(
    playgroundOutputs(workbench.committed, interactions),
  );
  const sampleLinks = $derived(
    PLAYGROUND_SAMPLES.map((s) => ({ id: s.id, title: s.title })),
  );
  const busy = $derived(agentIsBusy(agent));
  const phaseLine = $derived(resolvePhaseLine(agent, nowTick));
  const generateLabel = $derived(
    rateLimitLabel !== "" ? rateLimitLabel : "Generate",
  );
  const generateDisabled = $derived(
    rateLimitUntil !== null && nowTick < rateLimitUntil,
  );
  const handoffText = $derived(
    agentHandoffPrompt({
      currentSpec: workbench.committed,
      userGoal: prompt,
    }),
  );

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

  function replaceLocationHash(hash: string | null): void {
    const url = new URL(window.location.href);
    url.hash = hash ?? "";
    history.replaceState(history.state, "", url);
  }

  function restoreLocation(origin: "initial-navigation" | "popstate"): void {
    const decision = resolvePlaygroundHashRestore(
      origin,
      window.location.hash,
      shareCatalogs,
    );
    if (decision.kind === "noop") return;
    if (decision.kind === "reject") {
      replaceLocationHash(workbench.historyHash);
    }
    const previous = activeCandidate();
    const next = applyPlaygroundHashRestoreState(
      workbench,
      decision,
      origin,
      initialSeed,
    );
    workbench = next;
    if (decision.kind === "reject") {
      const cancel = rejectRestoreCancelPhase(previous, workbench.status);
      if (cancel !== null) noteCandidatePhase(cancel);
      return;
    }
    noteStagedCandidate(previous, next);
  }

  function onPopState(): void {
    restoreLocation("popstate");
  }

  onMount(() => {
    restoreLocation("initial-navigation");
    const id = window.setInterval(() => {
      nowTick = Date.now();
      if (rateLimitUntil !== null) {
        const remaining = Math.ceil((rateLimitUntil - nowTick) / 1000);
        if (remaining <= 0) {
          rateLimitUntil = null;
          rateLimitLabel = "";
        } else {
          rateLimitLabel = `Try again in ${remaining}s`;
        }
      }
    }, 500);
    return () => window.clearInterval(id);
  });

  function undoChart(): void {
    if (workbench.undoSnapshots.length === 0 || workbench.candidate !== null)
      return;
    if (busy) return;
    if (shouldConfirmDiscardForUndo(workbench)) {
      const discard = window.confirm(PLAYGROUND_UNDO_DISCARD_CONFIRM);
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
      const discard = window.confirm(PLAYGROUND_SAMPLE_DISCARD_CONFIRM);
      if (!discard) return false;
    }
    const sample = PLAYGROUND_SAMPLES.find((entry) => entry.id === id);
    if (sample === undefined) return false;
    const previous = activeCandidate();
    const next = stagePlaygroundSeed(workbench, sample.seed, "source");
    workbench = next;
    interactions = defaultPlaygroundInteractions();
    pendingInteractions = null;
    agent = createPlaygroundAgentState();
    noteStagedCandidate(previous, next);
    return true;
  }

  function stageAgentSeed(
    seed: PlaygroundSeedV1,
    nextInteractions: PlaygroundInteractions,
  ): void {
    const previous = activeCandidate();
    pendingInteractions = nextInteractions;
    const next = stagePlaygroundSeed(workbench, seed, "agent");
    workbench = next;
    agent = setAgentDrawing(agent);
    noteStagedCandidate(previous, next);
  }

  async function runAgentPipeline(
    userPrompt: string,
    dataset: PlaygroundDatasetId,
    options: {
      readonly example?: PlaygroundExamplePrompt;
      readonly signal?: AbortSignal;
    } = {},
  ): Promise<void> {
    agent = beginAgentRequest(agent, {
      exampleMode: options.example !== undefined,
    });

    let rawEnvelope: unknown;
    let envelope: PlaygroundAgentEnvelope;

    if (options.example !== undefined) {
      // Instant canned path (OV2-A) — brief phase line, then validate/stage.
      await new Promise((r) => setTimeout(r, 120));
      if (options.signal?.aborted) {
        agent = failAgent(agent, {
          code: "aborted",
          message: messageForAgentError("aborted"),
        });
        return;
      }
      envelope = options.example.envelope;
      rawEnvelope = {
        spec: envelope.spec,
        interactions: envelope.interactions,
        title: envelope.title,
      };
    } else {
      const first = await generateChart(
        {
          prompt: userPrompt,
          datasetId: dataset,
          currentSpec: workbench.committed,
        },
        { signal: options.signal },
      );
      if (!first.ok) {
        if (
          first.code === "rate_limited" ||
          first.code === "upstream_rate_limited"
        ) {
          const seconds = first.retryAfterSeconds ?? 60;
          rateLimitUntil = Date.now() + seconds * 1000;
          rateLimitLabel = `Try again in ${seconds}s`;
        }
        agent = failAgent(agent, {
          code: first.code,
          message: first.message,
          ...(first.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: first.retryAfterSeconds }),
        });
        return;
      }
      envelope = first.envelope;
      rawEnvelope = first.rawEnvelope;
    }

    agent = setAgentValidating(agent);
    let validated = validateAgentEnvelope(envelope, dataset);

    if (!validated.ok && options.example === undefined) {
      // One repair round with raw SpecError[].
      agent = setAgentRepairing(agent);
      const repair = await generateChart(
        {
          prompt: userPrompt,
          datasetId: dataset,
          currentSpec: workbench.committed,
          priorSpec: rawEnvelope,
          priorErrors: validated.errors as SpecError[],
        },
        { signal: options.signal },
      );
      if (!repair.ok) {
        agent = failAgent(agent, {
          code: repair.code,
          message: repair.message,
          details: validated.errors,
        });
        return;
      }
      envelope = repair.envelope;
      rawEnvelope = repair.rawEnvelope;
      validated = validateAgentEnvelope(envelope, dataset);
    }

    if (!validated.ok) {
      agent = failAgent(agent, {
        code: "validation",
        message: validated.message,
        details: validated.errors,
      });
      return;
    }

    stageAgentSeed(validated.seed, validated.interactions);
    agent = completeAgentSuccess(agent, {
      spec: validated.spec,
      interactions: validated.interactions,
      title: validated.title,
    });
  }

  function onGenerate(): void {
    if (busy || generateDisabled) return;
    if (prompt.trim() === "") return;
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    void runAgentPipeline(prompt, datasetId, { signal: controller.signal });
  }

  function onExample(example: PlaygroundExamplePrompt): void {
    if (busy) return;
    prompt = example.prompt;
    datasetId = example.datasetId;
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    void runAgentPipeline(example.prompt, example.datasetId, {
      example,
      signal: controller.signal,
    });
  }

  function onCancel(): void {
    abortController?.abort();
    abortController = null;
    agent = failAgent(agent, {
      code: "aborted",
      message: messageForAgentError("aborted"),
    });
  }

  async function onCopyHandoff(): Promise<void> {
    await tick();
    const text = agentHandoffPrompt({
      currentSpec: workbench.committed,
      userGoal: prompt,
    });
    // Prefer a transient element for clipboard binding.
    const el = document.createElement("button");
    document.body.appendChild(el);
    await copyText(text, el);
    el.remove();
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
    if (pendingInteractions !== null) {
      interactions = pendingInteractions;
      pendingInteractions = null;
    }
    noteCandidatePhase({
      generation,
      origin: origin ?? "agent",
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
    pendingInteractions = null;
    noteCandidatePhase({
      generation,
      origin: origin ?? "agent",
      phase: "failed",
      status: failed.status,
    });
    if (origin === "agent") {
      agent = failAgent(agent, {
        code: "pipeline",
        message: diagnostic.message,
      });
    }
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
      PLAYGROUND_ACTIVE_FAILED_STATUS,
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
    if (shareSource === undefined) {
      // PlaygroundCode triggers share; status via shareStatus only.
      shareStatus = playgroundShareCopyStatus(
        await copyText(shareUrl, document.body),
      );
      return;
    }
    const result = await copyText(shareUrl, shareSource);
    shareStatus = playgroundShareCopyStatus(result);
  }
</script>

<svelte:window onpopstate={onPopState} />

<section class="playground" aria-labelledby="playground-heading">
  <header class="playground-intro">
    <p class="eyebrow">Playground</p>
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
    {onExample}
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
      interactions = next;
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

  <PlaygroundCode
    {outputs}
    rendered={workbench.rendered}
    enabled={workbench.canCopyOrShare}
    {handoffText}
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
    font-size: 0.78rem;
  }

  @media (max-width: 47.99rem) {
    .playground {
      width: min(100% - 1.25rem, 72rem);
    }

    .share-result {
      grid-template-columns: 1fr;
    }
  }
</style>
