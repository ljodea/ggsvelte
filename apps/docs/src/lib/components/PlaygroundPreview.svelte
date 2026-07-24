<script lang="ts">
  import type { RenderModel } from "@ggsvelte/core";
  import { GGPlot } from "@ggsvelte/svelte";

  import type { PlaygroundInteractionEvent } from "$lib/playground-events";
  import {
    snapshotCandidateIsolation,
    type PlaygroundCandidateIsolation,
  } from "$lib/playground-candidate-lifecycle";
  import { pipelineErrorToPlaygroundDiagnostic } from "$lib/playground-pipeline-diagnostic";
  import {
    chartHasDiscreteLegend,
    coerceInteractionsForChart,
    defaultPlaygroundInteractions,
    interactionInvitationLine,
    type PlaygroundInteractions,
  } from "$lib/playground-agent-envelope";
  import type {
    PlaygroundCandidate,
    PlaygroundDiagnostic,
  } from "$lib/playground-state-types";
  import type { PortableSpec } from "@ggsvelte/spec";

  const {
    rendered,
    candidate,
    lastValid,
    status,
    interactions = defaultPlaygroundInteractions(),
    onInteractionsChange,
    onCandidateReady,
    onCandidateFailed,
    onActiveRendered,
    onActiveFailed,
    onInteraction,
    canUndo = false,
    undoDisabled = false,
    onUndo,
  }: {
    rendered: PortableSpec;
    candidate: PlaygroundCandidate | null;
    lastValid: boolean;
    status: string;
    interactions?: PlaygroundInteractions;
    onInteractionsChange?: (next: PlaygroundInteractions) => void;
    onCandidateReady: (
      generation: number,
      isolation: PlaygroundCandidateIsolation,
    ) => void;
    onCandidateFailed: (
      generation: number,
      diagnostic: PlaygroundDiagnostic,
    ) => void;
    onActiveRendered: (model: RenderModel) => void;
    onActiveFailed: (diagnostic: PlaygroundDiagnostic) => void;
    onInteraction: (event: PlaygroundInteractionEvent) => void;
    canUndo?: boolean;
    undoDisabled?: boolean;
    onUndo?: () => void;
  } = $props();

  let activeChartEl = $state<HTMLDivElement | undefined>();
  let candidateChartEl = $state<HTMLDivElement | undefined>();
  let promoteFade = $state(false);

  const hasLegend = $derived(chartHasDiscreteLegend(rendered));
  const effective = $derived(
    coerceInteractionsForChart(interactions, hasLegend),
  );
  const invitation = $derived(interactionInvitationLine(effective));

  // Candidate must render with the same interaction props as the promoted chart.
  const candidateInteractions = $derived(
    candidate !== null
      ? coerceInteractionsForChart(
          interactions,
          chartHasDiscreteLegend(candidate.next.rendered),
        )
      : effective,
  );

  function setCapability(patch: Partial<PlaygroundInteractions>): void {
    if (onInteractionsChange === undefined) return;
    let next: PlaygroundInteractions = { ...effective, ...patch };
    // Locked matrix: interval XOR zoom; select point XOR interval.
    if (patch.select === "interval") {
      next = { ...next, zoom: false };
    }
    if (patch.zoom === true && next.select === "interval") {
      next = { ...next, select: false };
    }
    onInteractionsChange(coerceInteractionsForChart(next, hasLegend));
  }

  function candidatePainted(generation: number): void {
    const candidateRoot =
      candidateChartEl ??
      (document.querySelector(".candidate-chart") as HTMLElement | null);
    if (candidateRoot === null) {
      onCandidateReady(generation, {
        inert: true,
        inertAttribute: true,
        ariaHidden: "true",
        activeRetained: false,
        activeTitle: null,
      });
      return;
    }
    const probe =
      (
        window as typeof window & {
          playgroundRetainedActive?: Element | null;
        }
      ).playgroundRetainedActive ?? null;
    onCandidateReady(
      generation,
      snapshotCandidateIsolation(candidateRoot, activeChartEl ?? null, probe),
    );
  }

  // Crossfade on promote: brief opacity when candidate clears after paint.
  $effect(() => {
    if (candidate === null) return;
    // When candidate appears, prepare; promote is handled by parent remount.
    promoteFade = false;
  });
</script>

<div class="preview">
  <div class="capability-row" role="group" aria-label="Enabled interactions">
    <span class="capability-label">Enabled interactions</span>
    <button
      type="button"
      class="cap"
      class:active={effective.inspect}
      aria-pressed={effective.inspect}
      onclick={() => setCapability({ inspect: !effective.inspect })}
    >
      Inspect
    </button>
    <button
      type="button"
      class="cap"
      class:active={effective.select === "point"}
      aria-pressed={effective.select === "point"}
      onclick={() =>
        setCapability({
          select: effective.select === "point" ? false : "point",
        })}
    >
      Select point
    </button>
    <button
      type="button"
      class="cap"
      class:active={effective.select === "interval"}
      aria-pressed={effective.select === "interval"}
      onclick={() =>
        setCapability({
          select: effective.select === "interval" ? false : "interval",
          zoom: false,
        })}
    >
      Select interval
    </button>
    <button
      type="button"
      class="cap"
      class:active={effective.zoom}
      aria-pressed={effective.zoom}
      disabled={effective.select === "interval"}
      onclick={() =>
        setCapability({
          zoom: !effective.zoom,
          select: effective.select === "interval" ? false : effective.select,
        })}
    >
      Zoom
    </button>
    {#if hasLegend}
      <button
        type="button"
        class="cap"
        class:active={effective.legendFilter}
        aria-pressed={effective.legendFilter}
        onclick={() => setCapability({ legendFilter: !effective.legendFilter })}
      >
        Legend filter
      </button>
      <button
        type="button"
        class="cap"
        class:active={effective.legendFocus}
        aria-pressed={effective.legendFocus}
        onclick={() => setCapability({ legendFocus: !effective.legendFocus })}
      >
        Legend focus
      </button>
    {/if}
    {#if canUndo && onUndo !== undefined}
      <button
        type="button"
        class="cap undo"
        disabled={undoDisabled}
        onclick={onUndo}
      >
        Previous chart
      </button>
    {/if}
  </div>

  {#if invitation !== ""}
    <p class="invitation">{invitation}</p>
  {/if}

  {#if lastValid}
    <p class="last-valid" role="status">Last valid result</p>
  {/if}

  {#if status !== ""}
    <p class="status" role="status" aria-live="polite">{status}</p>
  {/if}

  <div
    class="chart-stack"
    class:fade={promoteFade}
    aria-busy={candidate !== null}
  >
    <div class="active-chart" bind:this={activeChartEl}>
      {#key rendered}
        <svelte:boundary
          onerror={(error) =>
            onActiveFailed(pipelineErrorToPlaygroundDiagnostic(error))}
        >
          <GGPlot
            spec={rendered}
            width="container"
            inspect={effective.inspect}
            select={effective.select === false ? undefined : effective.select}
            zoom={effective.zoom}
            legendFilter={effective.legendFilter}
            legendFocus={effective.legendFocus}
            oninteraction={onInteraction}
            onrender={onActiveRendered}
          />
          {#snippet failed()}
            <div class="render-error" role="status">
              The last valid chart could not be painted. Try a sample to
              recover.
            </div>
          {/snippet}
        </svelte:boundary>
      {/key}
    </div>

    {#if candidate !== null}
      {#key candidate.generation}
        <div
          class="candidate-chart"
          aria-hidden="true"
          inert
          bind:this={candidateChartEl}
        >
          <svelte:boundary
            onerror={(error) =>
              onCandidateFailed(
                candidate.generation,
                pipelineErrorToPlaygroundDiagnostic(error),
              )}
          >
            <GGPlot
              spec={candidate.next.rendered}
              width="container"
              inspect={candidateInteractions.inspect}
              select={candidateInteractions.select === false
                ? undefined
                : candidateInteractions.select}
              zoom={candidateInteractions.zoom}
              legendFilter={candidateInteractions.legendFilter}
              legendFocus={candidateInteractions.legendFocus}
              onrender={() => candidatePainted(candidate.generation)}
            />
            {#snippet failed()}{/snippet}
          </svelte:boundary>
        </div>
      {/key}
    {/if}
  </div>
</div>

<style>
  .preview {
    display: grid;
    gap: 0.5rem;
  }

  .capability-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.15rem 0.35rem;
    min-height: 44px;
  }

  .capability-label {
    margin-right: 0.5rem;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .cap {
    appearance: none;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    min-height: 44px;
    padding: 0.35rem 0.5rem;
    color: var(--ink);
    font: 0.9rem/1.2 var(--body-font);
    cursor: pointer;
  }

  .cap.active {
    border-bottom-color: var(--accent);
    color: var(--accent);
  }

  .cap:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .cap.undo {
    margin-left: auto;
    color: var(--muted);
  }

  .invitation {
    margin: 0;
    color: var(--muted);
    font-size: 0.875rem;
  }

  .last-valid {
    margin: 0;
    color: var(--error);
    font-size: 0.8rem;
  }

  .status {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .chart-stack {
    display: grid;
    min-height: clamp(16rem, 56vh, 28rem);
    overflow: hidden;
    background: var(--paper);
  }

  .chart-stack.fade .active-chart {
    animation: promote-fade 180ms ease;
  }

  @keyframes promote-fade {
    from {
      opacity: 0.35;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chart-stack.fade .active-chart {
      animation: none;
    }
  }

  .active-chart,
  .candidate-chart {
    grid-area: 1 / 1;
    min-width: 0;
  }

  .candidate-chart {
    visibility: hidden;
    pointer-events: none;
  }

  .render-error {
    display: grid;
    min-height: clamp(16rem, 56vh, 28rem);
    place-items: center;
    padding: 1rem;
    color: var(--error);
    text-align: center;
  }

  @media (max-width: 34.99rem) {
    .capability-row {
      display: grid;
      grid-template-columns: 1fr;
    }

    .cap.undo {
      margin-left: 0;
    }
  }
</style>
