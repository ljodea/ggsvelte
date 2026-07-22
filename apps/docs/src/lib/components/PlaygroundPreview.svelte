<script lang="ts">
  import { PipelineError, type RenderModel } from "@ggsvelte/core";
  import { GGPlot } from "@ggsvelte/svelte";

  import type { PlaygroundInteractionEvent } from "$lib/playground-events";
  import {
    snapshotCandidateIsolation,
    type PlaygroundCandidateIsolation,
  } from "$lib/playground-candidate-lifecycle";
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
    onCandidateReady,
    onCandidateFailed,
    onActiveRendered,
    onActiveFailed,
    onInteraction,
  }: {
    rendered: PortableSpec;
    candidate: PlaygroundCandidate | null;
    lastValid: boolean;
    status: string;
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
  } = $props();

  let activeChartEl = $state<HTMLDivElement | undefined>();
  let candidateChartEl = $state<HTMLDivElement | undefined>();

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

  function diagnostic(error: unknown): PlaygroundDiagnostic {
    if (error instanceof PipelineError) {
      return {
        source: "pipeline",
        code: error.code,
        path: error.path,
        message: error.message,
        ...(error.diagnostic?.fixes[0]?.description === undefined
          ? {}
          : { fix: error.diagnostic.fixes[0].description }),
      };
    }
    return {
      source: "pipeline",
      code: "render-failed",
      path: "",
      message:
        error instanceof Error ? error.message : "The chart could not render.",
      fix: "Adjust the PortableSpec or reset the source.",
    };
  }
</script>

<div class="panel-heading">
  <div>
    <p class="panel-number">01</p>
    <h2>Preview</h2>
  </div>
  {#if lastValid}<strong class="last-valid">Last valid result</strong>{/if}
</div>

{#if status !== ""}
  <p class="status" role="status" aria-live="polite">{status}</p>
{/if}

<div class="chart-stack" aria-busy={candidate !== null}>
  <div class="active-chart" bind:this={activeChartEl}>
    {#key rendered}
      <svelte:boundary onerror={(error) => onActiveFailed(diagnostic(error))}>
        <GGPlot
          spec={rendered}
          width="container"
          inspect={true}
          oninteraction={onInteraction}
          onrender={onActiveRendered}
        />
        {#snippet failed()}
          <div class="render-error" role="status">
            The last valid chart could not be painted. Reset the source to
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
            onCandidateFailed(candidate.generation, diagnostic(error))}
        >
          <GGPlot
            spec={candidate.next.rendered}
            width="container"
            onrender={() => candidatePainted(candidate.generation)}
          />
          {#snippet failed()}{/snippet}
        </svelte:boundary>
      </div>
    {/key}
  {/if}
</div>

<style>
  :global(.preview-surface) {
    padding: 1rem 1.1rem 1.15rem;
  }

  .panel-heading {
    display: flex;
    min-height: 2rem;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.6rem;
  }

  .panel-heading h2,
  .panel-heading p,
  .status {
    margin: 0;
  }

  .panel-heading h2 {
    margin-top: 0.15rem;
    font-size: 1.05rem;
  }

  .panel-number {
    color: var(--accent);
    font: 700 0.7rem/1 var(--body-font);
    letter-spacing: 0.08em;
  }

  .last-valid {
    border: 1px solid currentColor;
    border-radius: 0.35rem;
    padding: 0.3rem 0.45rem;
    color: #9b2c20;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .status {
    padding-block: 0.55rem 0.35rem;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .chart-stack {
    display: grid;
    min-height: 28rem;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 0.35rem;
    background: var(--paper);
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
    min-height: 28rem;
    place-items: center;
    padding: 1rem;
    color: #9b2c20;
    text-align: center;
  }

  @media (max-width: 47.99rem) {
    :global(.preview-surface) {
      padding: 0.85rem 0.75rem;
    }

    .chart-stack {
      min-height: 22rem;
    }
  }
</style>
