<script lang="ts">
  import { PipelineError } from "@ggsvelte/core";
  import { GGPlot } from "@ggsvelte/svelte";

  import type { PlaygroundInteractionEvent } from "$lib/playground-events";
  import type {
    PlaygroundCandidate,
    PlaygroundDiagnostic,
  } from "$lib/playground-state";
  import type { PortableSpec } from "@ggsvelte/spec";

  const {
    rendered,
    candidate,
    lastValid,
    status,
    onCandidateRendered,
    onCandidateFailed,
    onActiveRendered,
    onActiveFailed,
    onInteraction,
  }: {
    rendered: PortableSpec;
    candidate: PlaygroundCandidate | null;
    lastValid: boolean;
    status: string;
    onCandidateRendered: (generation: number) => void;
    onCandidateFailed: (
      generation: number,
      diagnostic: PlaygroundDiagnostic,
    ) => void;
    onActiveRendered: () => void;
    onActiveFailed: (diagnostic: PlaygroundDiagnostic) => void;
    onInteraction: (event: PlaygroundInteractionEvent) => void;
  } = $props();

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
    <h2>See the result</h2>
  </div>
  {#if lastValid}<strong class="last-valid">Last valid result</strong>{/if}
</div>

<p class="status" role="status" aria-live="polite">{status}</p>

<div class="chart-stack" aria-busy={candidate !== null}>
  <div class="active-chart">
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
      <div class="candidate-chart" aria-hidden="true" inert>
        <svelte:boundary
          onerror={(error) =>
            onCandidateFailed(candidate.generation, diagnostic(error))}
        >
          <GGPlot
            spec={candidate.next.rendered}
            width="container"
            onrender={() => onCandidateRendered(candidate.generation)}
          />
          {#snippet failed()}{/snippet}
        </svelte:boundary>
      </div>
    {/key}
  {/if}
</div>

<p class="local-note">
  Rendering happens locally. Nothing in the editor is fetched, uploaded, or
  executed as code.
</p>

<style>
  :global(.preview-surface) {
    padding: 1rem;
  }

  .panel-heading {
    display: flex;
    min-height: 2.5rem;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.75rem;
  }

  .panel-heading h2,
  .panel-heading p,
  .status,
  .local-note {
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
    padding: 0.3rem 0.45rem;
    color: #9b2c20;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .status,
  .local-note {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .status {
    min-height: 2.7rem;
    padding-block: 0.75rem;
  }

  .chart-stack {
    display: grid;
    min-height: 25rem;
    overflow: hidden;
    border-block: 1px solid var(--line);
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
    min-height: 25rem;
    place-items: center;
    padding: 1rem;
    color: #9b2c20;
    text-align: center;
  }

  .local-note {
    border-top: 1px solid var(--line);
    padding-top: 0.75rem;
  }

  @media (max-width: 47.99rem) {
    :global(.preview-surface) {
      padding: 1rem 0;
    }

    .chart-stack {
      min-height: 22rem;
    }
  }
</style>
