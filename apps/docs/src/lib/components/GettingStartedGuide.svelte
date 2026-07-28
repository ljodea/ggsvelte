<script lang="ts">
  /**
   * Getting started: install, a basic plot, then geometry layers on real data.
   *
   * Every chart on this page renders from `foldSakura(n)` in scripts/quickstart
   * — the same fold that produces the fragments above them and the finished
   * file at the end. Nothing here re-derives a spec, so nothing here can drift
   * from what the reader copies.
   */
  import { base } from "$app/paths";
  import { kyotoSakura } from "@ggsvelte/svelte/data";
  import { onMount } from "svelte";

  import {
    foldSakura,
    QUICKSTART_CLI_FRAGMENT,
    QUICKSTART_HEADLESS_FRAGMENT,
    QUICKSTART_PAGE_SVELTE,
    QUICKSTART_PORTABLE_SPEC_FRAGMENT,
    SAKURA_FINISHED_SVELTE,
    SAKURA_RECORDS,
    SAKURA_STEPS,
  } from "$scripts/quickstart";
  import {
    LESSON_CHART_HEIGHT,
    LESSON_CHART_WIDTH,
    sakuraFinishedHeight,
  } from "$lib/generated/lesson-charts";

  import CopyCode from "./CopyCode.svelte";

  const rows = kyotoSakura.map((row) => ({ ...row }));

  /**
   * Below this chart width, hand-placed callouts collide with the data, so the
   * records move into the aria-label only (bands, trend and points never move).
   * Measured on the chart container, never on the viewport.
   */
  const NARROW_CHART = 560;

  /**
   * Assume narrow until the finished-chart container is measured. Starting at
   * `false` forced a wide fold on first paint, then a second 838-point fold
   * when ResizeObserver fired — on mobile that double work blocked chrome for
   * ~17s before "Open site menu" was tappable (#972). Desktop still flips once
   * (narrow → wide) when the container is actually wide enough for callouts.
   *
   * First paint uses the narrow probe height from the generated size table so
   * we do not reserve a desktop-tall plot before ResizeObserver fires.
   */
  let narrowChart = $state(true);
  /** Measured container width; drives live plot height via build-time chrome table. */
  let chartWidth = $state(0);
  let finishedChart = $state<HTMLElement>();
  /** Live plot component — dynamically imported when near the viewport (#972). */
  let LivePlot = $state<null | (typeof import("@ggsvelte/svelte"))["GGPlot"]>(
    null,
  );

  /**
   * Fold only when the live plot is mounted. Computing the 838-point spec
   * during first hydrate (even behind a placeholder) blocked mobile chrome
   * for ~20s (#972).
   */
  const finished = $derived(
    LivePlot === null
      ? null
      : foldSakura(SAKURA_STEPS.length, rows, { annotations: !narrowChart }),
  );

  /**
   * Outer plot height from the build-time size table (pipeline-measured chrome
   * so the *data panel* stays ~2.5:1). Never invent chrome constants here —
   * regenerating lesson charts refreshes the table.
   */
  const liveHeight = $derived(
    sakuraFinishedHeight(chartWidth > 0 ? chartWidth : NARROW_CHART),
  );

  const recordNames = SAKURA_RECORDS.map((record) => record.label).join("; ");

  /**
   * Intermediate step charts ship as SVG the library rendered at build time
   * (scripts/gen-lesson-charts.ts). The final "Finish it" step is the live
   * 838-point plot — loaded when near the viewport so mobile chrome stays
   * tappable (#972).
   */
  const chartSrc = (step: number): string =>
    `${base}/lesson/${step < 0 ? "first-render.svg" : `step-${String(step + 1)}.svg`}`;

  onMount(() => {
    const target = finishedChart;
    if (target === undefined) return;
    let cancelled = false;
    let loadStarted = false;

    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width !== undefined) {
              narrowChart = width < NARROW_CHART;
              chartWidth = width;
            }
          });
    observer?.observe(target);

    const loadLivePlot = (): void => {
      if (loadStarted || cancelled) return;
      loadStarted = true;
      void import("@ggsvelte/svelte").then((mod) => {
        if (!cancelled) LivePlot = mod.GGPlot;
      });
    };

    // Near-viewport only — do not idle-load. An early dynamic import + fold
    // still monopolizes the main thread and stalls header clicks (#972).
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadLivePlot();
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(target);

    return () => {
      cancelled = true;
      observer?.disconnect();
      io.disconnect();
    };
  });
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
  <p>
    Data ships with the package as
    <code>@ggsvelte/svelte/data</code>
    (<code>kyotoSakura</code>: 838 peak-bloom observations). Drop this into a
    route or component:
  </p>
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

  <h2 id="add-geometry-layers">Add geometry layers</h2>

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
          <a href={`${base}${step.href}`}>Read {step.chapterTitle}</a>
        </div>
        {#if isFinish}
          <div class="finished-chart lesson-output" bind:this={finishedChart}>
            {#if LivePlot && finished}
              <LivePlot
                spec={finished.spec}
                key={finished.key}
                inspect={finished.inspect}
                height={liveHeight}
                ariaLabel={`Kyoto cherry blossom, finished. Called out: ${recordNames}.`}
              />
            {:else}
              <img
                class="lesson-chart"
                src={chartSrc(index)}
                width={LESSON_CHART_WIDTH}
                height={LESSON_CHART_HEIGHT}
                alt={`Kyoto cherry blossom, finished. Called out: ${recordNames}.`}
              />
            {/if}
          </div>
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

  <h2 id="built-for-agents">Built for agents</h2>
  <p>
    The chart above is also a JSON document. Every ggsvelte plot normalizes to a
    PortableSpec: no functions, no closures, nothing that has to be executed to
    be understood. That is the surface an agent writes to.
  </p>
  <p>
    Data has three forms. Inline <code>values</code> for tables small enough to
    read; <code>columns</code> under a named <code>datasets</code> entry for
    anything large or reused; <code>{`{ "name": ... }`}</code> to point a layer
    at one. The 838 Kyoto rows are served whole at
    <a href={`${base}/kyoto-sakura.json`}>/kyoto-sakura.json</a>.
  </p>
  <CopyCode
    class="lesson-source"
    language="json"
    accessibleLabel="Copy Spec (JSON) fragment"
    code={QUICKSTART_PORTABLE_SPEC_FRAGMENT}
  />
  <p>
    <code>validate(spec)</code> is the correction loop, and it was built for
    this audience: every error carries a stable <code>code</code>, a JSON
    <code>path</code>
    into the spec, and a <code>fix</code> naming the change to make. An agent
    emits, validates, applies the fix, and re-emits without a human in the loop.
    The
    <a href={`${base}/guide/errors`}>errors reference</a> is the full catalog.
  </p>
  <p>
    Rendering never needs a browser. <code>renderToSVGString</code> is pure, and
    the installed <code>ggsvelte-render</code> CLI writes SVG to stdout with JSON
    Lines diagnostics on stderr.
  </p>
  <CopyCode
    class="lesson-source"
    language="typescript"
    accessibleLabel="Copy headless fragment"
    code={QUICKSTART_HEADLESS_FRAGMENT}
  />
  <CopyCode
    class="lesson-source"
    language="bash"
    accessibleLabel="Copy CLI fragment"
    code={QUICKSTART_CLI_FRAGMENT}
  />
  <p>
    Agents working in this codebase should read
    <a href={`${base}/llms.txt`}>/llms.txt</a> first: it is the same grammar, written
    for a reader that emits specs instead of typing them.
  </p>

  <h2 id="the-rest-of-the-grammar">The rest of the grammar</h2>
  <ul>
    <li>
      <a href={`${base}/themes`}>Chart themes</a> and
      <a href={`${base}/palettes`}>palettes</a> — paper/ink chrome and data color.
    </li>
    <li>
      <a href={`${base}/guide/facets-coordinates`}>Facets and coordinates</a> — small
      multiples, flipped and fixed-aspect coordinates.
    </li>
    <li>
      <a href={`${base}/guide/statistics-positions`}>Statistics and positions</a
      > — bins, summaries, jitter, stacking and dodging.
    </li>
  </ul>

  <h2 id="where-next">Where next</h2>
  <ul>
    <li><a href={`${base}/examples`}>Examples</a></li>
    <li><a href={`${base}/guide/interactions`}>Interactions</a></li>
    <li><a href={`${base}/guide/production`}>Production</a></li>
  </ul>
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

  .lesson-block > section,
  .progressive-step > div {
    min-width: 0;
    padding: 1rem;
  }

  .lesson-block > section + section,
  .progressive-step > div + div {
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

  /*
   * The finished chart gains a tooltip and a pinned-value rail on hydration.
   * Floor matches the narrow probe height (~280–320px), not the desktop one —
   * over-reserving leaves empty space under a phone chart.
   */
  .finished-chart {
    min-height: 18rem;
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

  /*
   * Translucent band fills do not survive forced-colors mode. Epoch names
   * remain available via the bottom legend (and the aria-label on the live
   * chart).
   */
  @media (forced-colors: active) {
    .lesson-output :global(.gg-marks rect) {
      fill: none;
    }
  }
</style>
