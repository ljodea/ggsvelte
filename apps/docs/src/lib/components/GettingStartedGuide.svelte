<script lang="ts">
  /**
   * Getting started: install, a basic plot, then layers on real data.
   *
   * Every chart on this page renders from `foldSakura(n)` in scripts/quickstart
   * — the same fold that produces the fragments above them and the finished
   * file at the end. Nothing here re-derives a spec, so nothing here can drift
   * from what the reader copies.
   *
   * The live finished chart lives in LessonFinishedChart so this file stays
   * page structure only (prose, static step images, copy blocks).
   */
  import { base } from "$app/paths";

  import {
    QUICKSTART_PAGE_SVELTE,
    QUICKSTART_PORTABLE_SPEC_FRAGMENT,
    SAKURA_FINISHED_SVELTE,
    SAKURA_STEPS,
  } from "$scripts/quickstart";
  import {
    LESSON_CHART_HEIGHT,
    LESSON_CHART_WIDTH,
  } from "$lib/generated/lesson-charts";
  import { KYOTO_SAKURA_CITATION } from "@ggsvelte/svelte/data";

  import CopyCode from "./CopyCode.svelte";
  import LessonFinishedChart from "./LessonFinishedChart.svelte";

  /**
   * Intermediate step charts ship as SVG the library rendered at build time
   * (scripts/gen-lesson-charts.ts). The final "Make it interactive" step is the
   * live 838-point plot in LessonFinishedChart.
   */
  const chartSrc = (step: number): string =>
    `${base}/lesson/${step < 0 ? "first-render.svg" : `step-${String(step + 1)}.svg`}`;
</script>

<article class="guide getting-started-guide">
  <h1>Getting started</h1>

  <h2 id="install">Install</h2>
  <p>Node.js 22 or newer. In an existing SvelteKit (or Svelte) app:</p>
  <CopyCode
    class="lesson-source"
    language="bash"
    accessibleLabel="Copy install command"
    code="bun add @ggsvelte/svelte"
  />

  <h2 id="start-with-a-basic-plot">Start with a basic plot</h2>
  <div class="lesson-block">
    <CopyCode
      class="lesson-source lesson-source--file"
      language="svelte"
      title="Example.svelte"
      accessibleLabel="Copy complete file"
      code={QUICKSTART_PAGE_SVELTE}
    />
    <img
      class="lesson-chart"
      src={chartSrc(-1)}
      width={LESSON_CHART_WIDTH}
      height={LESSON_CHART_HEIGHT}
      alt="Peak cherry-blossom dates in Kyoto, 812 to 2026, as a scatter"
    />
  </div>

  <h2 id="add-layers">Add layers</h2>

  <div class="lesson-steps">
    {#each SAKURA_STEPS as step, index (step.id)}
      {@const isFinish = index === SAKURA_STEPS.length - 1}
      <section class="progressive-step" aria-labelledby={step.id}>
        <div class="step-copy">
          <h3 id={step.id}>{step.title}</h3>
          {#if step.outcome !== ""}
            <p>{step.outcome}</p>
          {/if}
          <CopyCode
            class="lesson-source"
            language="svelte"
            accessibleLabel={`Copy ${step.title} fragment`}
            code={step.fragment}
          />
          {#if step.explanation !== ""}
            <p>{step.explanation}</p>
          {/if}
        </div>
        {#if isFinish}
          <LessonFinishedChart placeholderSrc={chartSrc(index)} />
        {:else}
          <img
            class="lesson-chart"
            src={chartSrc(index)}
            width={LESSON_CHART_WIDTH}
            height={LESSON_CHART_HEIGHT}
            alt={`Kyoto cherry blossom after step ${index + 1}: ${step.title}`}
          />
        {/if}
      </section>
    {/each}
  </div>

  <h2 id="the-finished-file">The finished file</h2>
  <CopyCode
    class="lesson-source lesson-source--file"
    language="svelte"
    title="Sakura.svelte"
    accessibleLabel="Copy finished file"
    code={SAKURA_FINISHED_SVELTE}
  />

  <h2 id="agent-json-spec">Agent JSON spec</h2>
  <CopyCode
    class="lesson-source"
    language="json"
    title="spec.json"
    accessibleLabel="Copy Spec (JSON) fragment"
    code={QUICKSTART_PORTABLE_SPEC_FRAGMENT}
  />

  <h2 id="where-next">Where next</h2>
  <ul>
    <li><a href={`${base}/examples`}>Examples</a></li>
    <li><a href={`${base}/guide/interactions`}>Interactions</a></li>
    <li><a href={`${base}/guide/production`}>Production</a></li>
  </ul>

  <footer class="lesson-footnote">
    <p>
      Solid rule: the pre-industrial median bloom day, 15 April (1600–1850).
      {KYOTO_SAKURA_CITATION}
    </p>
  </footer>
</article>

<style>
  /*
   * Code on top, chart below — never side-by-side. Side-by-side crushes the
   * plot on every viewport and is banned on this docs site. Code blocks stand
   * on their own (bun-like dark cards); no shaded casing panels around them.
   */
  .lesson-block,
  .progressive-step {
    display: grid;
    gap: 1.25rem;
    margin: 1.5rem 0 3rem;
  }

  /*
   * The finished chart is a child component whose root carries
   * .finished-chart — style it with :global so scoped CSS still reaches that
   * slot.
   */
  .lesson-block > *,
  .progressive-step > *,
  .progressive-step > :global(.finished-chart) {
    min-width: 0;
  }

  .lesson-chart {
    display: block;
    width: 100%;
    height: auto;
  }

  .step-copy h3 {
    margin-top: 0;
  }

  .getting-started-guide :global(.lesson-source.copy-code) {
    max-height: 28rem;
    overflow: auto;
  }

  .getting-started-guide :global(.lesson-source .code-body pre) {
    white-space: pre;
  }

  .lesson-footnote {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .lesson-footnote p {
    margin: 0;
  }
</style>
