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
    <section class="lesson-code">
      <div class="lesson-label">Svelte</div>
      <CopyCode
        class="lesson-source lesson-source--file"
        language="svelte"
        accessibleLabel="Copy complete file"
        code={QUICKSTART_PAGE_SVELTE}
      />
    </section>
    <section class="lesson-output">
      <div class="lesson-label">Output</div>
      <img
        class="lesson-chart"
        src={chartSrc(-1)}
        width={LESSON_CHART_WIDTH}
        height={LESSON_CHART_HEIGHT}
        alt="Peak cherry-blossom dates in Kyoto, 812 to 2026, as a scatter"
      />
    </section>
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
          <div class="lesson-output">
            <img
              class="lesson-chart"
              src={chartSrc(index)}
              width={LESSON_CHART_WIDTH}
              height={LESSON_CHART_HEIGHT}
              alt={`Kyoto cherry blossom after step ${index + 1}: ${step.title}`}
            />
          </div>
        {/if}
      </section>
    {/each}
  </div>

  <h2 id="the-finished-file">The finished file</h2>
  <CopyCode
    class="lesson-source lesson-source--file"
    language="svelte"
    accessibleLabel="Copy finished file"
    code={SAKURA_FINISHED_SVELTE}
  />

  <h2 id="agent-json-spec">Agent JSON spec</h2>
  <CopyCode
    class="lesson-source"
    language="json"
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
   * plot on every viewport and is banned on this docs site.
   */
  .lesson-block,
  .progressive-step {
    display: grid;
    margin: 1.5rem 0 3rem;
    border-block: 1px solid var(--line);
  }

  /*
   * Static step panels are plain divs in this component. The finished chart is
   * a child component whose root carries .finished-chart — style it with
   * :global so scoped CSS still pads and separates that slot.
   */
  .lesson-block > section,
  .progressive-step > div,
  .progressive-step > :global(.finished-chart) {
    min-width: 0;
    padding: 1rem;
  }

  .lesson-block > section + section,
  .progressive-step > div + div,
  .progressive-step > div + :global(.finished-chart) {
    border-top: 1px solid var(--line);
  }

  .lesson-chart {
    display: block;
    width: 100%;
    height: auto;
  }

  .lesson-output {
    min-width: 0;
    overflow: hidden;
    background: #fff;
    color: #172033;
  }

  .lesson-label {
    margin-bottom: 0.75rem;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .lesson-code,
  .step-copy {
    background: var(--wash);
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

  /*
   * Translucent band fills do not survive forced-colors mode. Epoch names
   * remain available via the bottom legend (and the aria-label on the live
   * chart). The live finished chart carries the same rule in its own file.
   */
  @media (forced-colors: active) {
    .lesson-output :global(.gg-marks rect) {
      fill: none;
    }
  }
</style>
