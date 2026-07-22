<script lang="ts">
  import { pushState as pushSvelteKitState } from "$app/navigation";
  import { onMount, tick } from "svelte";

  import type { AxisGuidePlan, RenderModel } from "@ggsvelte/core";

  import { copyText, MANUAL_LINK_COPY_STATUS } from "$lib/clipboard";
  import PlaygroundEditor from "$lib/components/PlaygroundEditor.svelte";
  import PlaygroundEvents from "$lib/components/PlaygroundEvents.svelte";
  import PlaygroundOutput from "$lib/components/PlaygroundOutput.svelte";
  import PlaygroundPreview from "$lib/components/PlaygroundPreview.svelte";
  import PlaygroundShell from "$lib/components/PlaygroundShell.svelte";
  import {
    PLAYGROUND_EXAMPLES,
    PLAYGROUND_SAMPLES,
  } from "$lib/generated/playground-seeds";
  import {
    acceptCandidatePhase,
    candidateTransitionAccepted,
    createCandidateLifecycleTracker,
    emitPlaygroundCandidatePhase,
    type PlaygroundCandidateIsolation,
    type PlaygroundCandidatePhaseDetail,
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
    type PlaygroundCandidateOrigin,
    type PlaygroundDiagnostic,
  } from "$lib/playground-state";
  const initialSample = PLAYGROUND_SAMPLES[0]!;
  const initialSeed: PlaygroundSeedV1 = initialSample.seed;

  let workbench = $state(createPlaygroundState(initialSeed));
  let shareUrl = $state("");
  let shareStatus = $state("");
  let shareSource = $state<HTMLElement>();
  let reportSource = $state<HTMLElement>();
  let reportStatus = $state("");
  let scaleDecisions = $state<RenderModel["scaleDecisions"]>([]);
  let guidePlans = $state<readonly AxisGuidePlan[]>([]);
  let events = $state<readonly PlaygroundEventEntry[]>([]);
  let lifecycleTracker = $state(createCandidateLifecycleTracker());

  function noteCandidatePhase(detail: PlaygroundCandidatePhaseDetail): void {
    const accepted = acceptCandidatePhase(lifecycleTracker, detail);
    if (accepted === null) return;
    lifecycleTracker = accepted.tracker;
    emitPlaygroundCandidatePhase(accepted.detail);
  }

  function noteStagedCandidate(
    previous: { generation: number; origin: PlaygroundCandidateOrigin } | null,
    next: typeof workbench,
  ): void {
    if (
      previous !== null &&
      (next.candidate === null ||
        next.candidate.generation !== previous.generation)
    ) {
      noteCandidatePhase({
        generation: previous.generation,
        origin: previous.origin,
        phase: "cancelled",
        status: next.status,
      });
    }
    if (next.candidate !== null) {
      noteCandidatePhase({
        generation: next.candidate.generation,
        origin: next.candidate.origin,
        phase: "pending",
        status: next.status,
      });
    }
  }

  function activeCandidate(): {
    generation: number;
    origin: PlaygroundCandidateOrigin;
  } | null {
    const candidate = workbench.candidate;
    return candidate === null
      ? null
      : { generation: candidate.generation, origin: candidate.origin };
  }

  const outputs = $derived(playgroundOutputs(workbench.committed));
  const scaleReport = $derived(privacySafeScaleReport());
  const selectedSample = $derived(
    workbench.seed.source.kind === "sample" ? workbench.seed.source.id : "",
  );

  function replaceLocationHash(hash: string | null): void {
    const url = new URL(window.location.href);
    url.hash = hash ?? "";
    history.replaceState(history.state, "", url);
  }

  function verifiedSharedSeed(
    hash: string,
    seed: PlaygroundSeedV1,
  ): PlaygroundSeedV1 {
    const source = seed.source;
    if (source.kind === "custom") return seed;
    const trusted =
      source.kind === "example"
        ? PLAYGROUND_EXAMPLES.some(
            (entry) =>
              entry.id === source.id &&
              entry.compatibility.supported &&
              entry.compatibility.fragment === hash,
          )
        : PLAYGROUND_SAMPLES.some(
            (entry) => entry.id === source.id && entry.fragment === hash,
          );
    return trusted ? seed : { ...seed, source: { kind: "custom" } };
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
        {
          source: "playground",
          code: decoded.error.code.toLowerCase().replaceAll("_", "-"),
          path: "#play",
          message: decoded.error.message,
          fix: "Open a generated example link or reset to a built-in sample.",
        },
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
      verifiedSharedSeed(window.location.hash, decoded.seed),
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
    if (previous !== null && edited.candidate === null) {
      noteCandidatePhase({
        generation: previous.generation,
        origin: previous.origin,
        phase: "cancelled",
        status: edited.status,
      });
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
    if (!workbench.synchronized) {
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
    if (
      !workbench.synchronized ||
      workbench.candidate !== null ||
      workbench.seed.source.kind === "custom"
    ) {
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
    scaleDecisions = [];
    guidePlans = [];
    reportStatus = "";
    events = [];
    if (
      (origin === "apply" ||
        origin === "source" ||
        origin === "reset" ||
        origin === "undo") &&
      window.location.hash.startsWith("#play=")
    ) {
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

  function activeRendered(model: RenderModel): void {
    workbench = confirmPlaygroundRendered(workbench);
    scaleDecisions = model.scaleDecisions;
    guidePlans = model.guidePlans.filter(
      (guide): guide is AxisGuidePlan => guide.type === "axis",
    );
    reportStatus = "";
  }

  function recordInteraction(event: PlaygroundInteractionEvent): void {
    events = appendPlaygroundEvent(events, event);
  }

  function activeFailed(diagnostic: PlaygroundDiagnostic): void {
    scaleDecisions = [];
    guidePlans = [];
    reportStatus = "";
    const previous = activeCandidate();
    workbench = reportPlaygroundDiagnostic(
      workbench,
      diagnostic,
      "The current chart stopped safely. Reset the source to recover.",
      false,
    );
    if (previous !== null) {
      noteCandidatePhase({
        generation: previous.generation,
        origin: previous.origin,
        phase: "cancelled",
        status: workbench.status,
      });
    }
  }

  function privacySafeScaleReport(): string {
    return JSON.stringify(
      {
        decisions: scaleDecisions.map((decision) => ({
          aesthetic: decision.aesthetic,
          status: decision.status,
          parser: decision.parser,
          kind: decision.kind,
          precision: decision.precision,
          validatedCount: decision.validatedCount,
          ambiguityCount: decision.ambiguity.length,
          portableOverride: {
            ...(decision.portableOverride.type !== undefined && {
              type: decision.portableOverride.type,
            }),
            ...(decision.portableOverride.temporalKind !== undefined && {
              temporalKind: decision.portableOverride.temporalKind,
            }),
            ...(decision.portableOverride.parse !== undefined && {
              parse: decision.portableOverride.parse,
            }),
          },
          guidePlanIds: decision.guidePlanIds ?? [],
        })),
        guides: guidePlans.map((guide) => ({
          id: guide.id,
          aesthetic: guide.aesthetic,
          panelIndex: guide.panelIndex,
          scaleType: guide.scaleType,
          temporalKind: guide.temporalKind,
          source: guide.source,
          interval: guide.interval,
          locale: guide.locale,
          timezone: guide.timezone,
          majorCount: guide.ticks.filter((entry) => entry.kind === "major")
            .length,
          minorCount: guide.ticks.filter((entry) => entry.kind === "minor")
            .length,
          overlap: guide.overlap,
          marginOverflow: guide.marginOverflow,
          degraded: guide.degraded,
        })),
      },
      null,
      2,
    );
  }

  async function copyScaleReport(): Promise<void> {
    if (reportSource === undefined) return;
    const result = await copyText(scaleReport, reportSource);
    reportStatus =
      result === "copied"
        ? "Copied a privacy-safe scale report without rows, field names, domains, or labels."
        : "Clipboard unavailable. The privacy-safe scale report is selected for manual copy.";
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
      result === "copied"
        ? "Share link copied. The PortableSpec is now in this URL and browser history."
        : MANUAL_LINK_COPY_STATUS;
  }
</script>

<section class="playground" aria-labelledby="playground-heading">
  <header class="playground-intro">
    <div>
      <p class="eyebrow">Local only</p>
      <h1 id="playground-heading">Playground</h1>
      <p class="lede">
        Edit a bounded PortableSpec. Inspect semantic events. Export Svelte,
        builder TypeScript, JSON, or SVG. No upload, remote fetch, or code
        execution.
      </p>
    </div>
    <div class="share-actions">
      <button type="button" onclick={share} disabled={!workbench.canCopyOrShare}
        >Share this chart</button
      >
      <p>
        Sharing explicitly puts the bounded PortableSpec in the URL and browser
        history. URL fragments are not sent with HTTP requests, but anyone with
        the link can read it.
      </p>
    </div>
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

  <section class="guide-inspector" aria-labelledby="axis-plans-heading">
    <div>
      <p class="eyebrow">Semantic inspection</p>
      <h2 id="axis-plans-heading">Axis plans</h2>
      <p>
        Inspect bounded scale and guide decisions without copying source rows,
        field names, domains, or labels.
      </p>
    </div>

    <div class="guide-summary">
      {#if scaleDecisions.length === 0}
        <p>No temporal scale decision is active for this chart.</p>
      {:else}
        {#each scaleDecisions as decision}
          <dl>
            <div>
              <dt>Axis</dt>
              <dd>{decision.aesthetic}</dd>
            </div>
            <div>
              <dt>Choice</dt>
              <dd>{decision.status} · {decision.parser ?? "none"}</dd>
            </div>
            <div>
              <dt>Precision</dt>
              <dd>{decision.precision ?? "none"}</dd>
            </div>
            <div>
              <dt>Validated</dt>
              <dd>{decision.validatedCount.toLocaleString()} values</dd>
            </div>
          </dl>
        {/each}
      {/if}

      {#each guidePlans as guide (guide.id)}
        <dl>
          <div>
            <dt>Axis</dt>
            <dd>{guide.aesthetic} · panel {guide.panelIndex + 1}</dd>
          </div>
          <div>
            <dt>Break choice</dt>
            <dd>{guide.source} · {guide.interval ?? "scale default"}</dd>
          </div>
          <div>
            <dt>Ticks</dt>
            <dd>
              {guide.ticks.filter((entry) => entry.kind === "major").length} major
              ·
              {guide.ticks.filter((entry) => entry.kind === "minor").length} minor
            </dd>
          </div>
          <div>
            <dt>Layout</dt>
            <dd>
              {guide.overlap ? "overlap" : "fits"}{guide.marginOverflow
                ? " · margin overflow"
                : ""}
            </dd>
          </div>
        </dl>
      {/each}
    </div>

    <div class="report-actions">
      <button type="button" onclick={() => void copyScaleReport()}
        >Copy privacy-safe scale report</button
      >
      <a
        href="https://github.com/ljodea/ggsvelte/issues/new?title=Scale%20report"
        target="_blank"
        rel="noreferrer">Report a scale issue</a
      >
      <pre
        class="report-source"
        aria-hidden="true"
        bind:this={reportSource}>{scaleReport}</pre>
      <p role="status" aria-live="polite">{reportStatus}</p>
    </div>
  </section>
</section>

<style>
  .playground {
    width: min(100% - 2rem, 96rem);
    margin: 0 auto;
    padding-block: clamp(2rem, 5vw, 4.5rem);
  }

  .playground-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
  }

  .eyebrow {
    margin: 0;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 14ch;
    margin: 0.3rem 0 1rem;
    font-size: clamp(2.7rem, 6vw, 6rem);
    line-height: 0.92;
    letter-spacing: -0.045em;
  }

  .lede {
    max-width: 48rem;
    margin: 0;
    color: var(--muted);
    font-size: 1.05rem;
  }

  .share-actions {
    display: grid;
    gap: 0.65rem;
    border-top: 1px solid var(--line);
    padding-top: 1rem;
  }

  .share-actions button {
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 2px;
    background: var(--ink);
    color: var(--paper);
    font: 650 0.88rem/1 var(--body-font);
    cursor: pointer;
  }

  .share-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .share-actions p,
  .share-result p {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .share-result {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    margin-top: 1rem;
    border-block: 1px solid var(--line);
    padding-block: 0.75rem;
  }

  .share-result code {
    min-width: 0;
    overflow-x: auto;
    white-space: nowrap;
  }

  .guide-inspector {
    display: grid;
    grid-template-columns: minmax(12rem, 0.7fr) minmax(0, 1.3fr);
    gap: 1rem 2rem;
    margin-top: 1.5rem;
    border: 1px solid var(--line);
    padding: 1rem;
  }

  .guide-inspector h2,
  .guide-inspector p,
  .guide-summary dl {
    margin: 0;
  }

  .guide-inspector h2 {
    margin-block: 0.2rem 0.5rem;
  }

  .guide-inspector > div > p:not(.eyebrow),
  .report-actions p {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .guide-summary {
    display: grid;
    gap: 0.75rem;
  }

  .guide-summary dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.75rem;
  }

  .guide-summary dl div {
    min-width: 0;
  }

  .guide-summary dt {
    color: var(--muted);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .guide-summary dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .report-actions {
    display: flex;
    grid-column: 1 / -1;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
  }

  .report-actions button {
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 2px;
    background: var(--ink);
    padding-inline: 0.8rem;
    color: var(--paper);
    font: 650 0.82rem/1 var(--body-font);
    cursor: pointer;
  }

  .report-actions a {
    color: var(--accent);
    font-size: 0.82rem;
    font-weight: 650;
  }

  .report-actions p {
    flex-basis: 100%;
  }

  .report-source {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: pre;
  }

  @media (max-width: 47.99rem) {
    .playground {
      width: min(100% - 1.25rem, 96rem);
    }

    .playground-intro {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .share-result,
    .guide-inspector,
    .guide-summary dl {
      grid-template-columns: 1fr;
    }
  }
</style>
