<script lang="ts">
  /**
   * The getting-started walkthrough: one editorial chart, built one grammar
   * element at a time.
   *
   * Every chart on this page renders from `foldSakura(n)` in scripts/quickstart
   * — the same fold that produces the fragments beside them and the finished
   * file at the end. Nothing here re-derives a spec, so nothing here can drift
   * from what the reader copies.
   */
  import { base } from "$app/paths";
  import { GGPlot } from "@ggsvelte/svelte";
  import { kyotoSakura } from "@ggsvelte/svelte/data";
  import { onMount } from "svelte";

  import {
    foldSakura,
    QUICKSTART_CLI_FRAGMENT,
    QUICKSTART_HEADLESS_FRAGMENT,
    QUICKSTART_PAGE_SVELTE,
    QUICKSTART_PORTABLE_SPEC_FRAGMENT,
    SAKURA_EPOCHS,
    SAKURA_FINISHED_SVELTE,
    SAKURA_RECORDS,
    SAKURA_STEPS,
  } from "$scripts/quickstart";
  import { nextRovingTabIndex } from "$lib/tab-roving";

  import CopyCode from "./CopyCode.svelte";

  const rows = kyotoSakura.map((row) => ({ ...row }));

  /**
   * Below this chart width, hand-placed callouts collide with the data, so the
   * records move to the caption under the chart (the bands, trend and points
   * never move). Measured on the chart container, never on the viewport.
   */
  const NARROW_CHART = 560;

  const lessonSurfaces = ["output", "svelte"] as const;
  let lessonEnhanced = $state(false);
  let narrowChart = $state(false);
  let lessonSurface = $state<"output" | "svelte">("output");
  let outputTab = $state<HTMLButtonElement>();
  let svelteTab = $state<HTMLButtonElement>();
  let stepColumn = $state<HTMLElement>();

  const firstRender = foldSakura(0, rows);
  const finished = foldSakura(SAKURA_STEPS.length, rows);

  // The chart beside each step: everything taught so far, and nothing after.
  const accumulated = $derived(
    SAKURA_STEPS.map((_, index) =>
      foldSakura(index + 1, rows, { annotations: !narrowChart }),
    ),
  );

  const epochNames = SAKURA_EPOCHS.map((band) => band.epoch).join(", ");
  const recordNames = SAKURA_RECORDS.map((record) => record.label).join("; ");

  onMount(() => {
    lessonEnhanced = true;
    // Measure a real chart, not the page: the ladder is about how much room the
    // plot has, which in this two-pane layout is roughly half the column.
    const target = stepColumn?.querySelector(".lesson-output");
    if (target === null || target === undefined) return;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) narrowChart = width < NARROW_CHART;
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  });

  function selectLessonSurface(
    surface: "output" | "svelte",
    focus = false,
  ): void {
    lessonSurface = surface;
    if (focus) (surface === "output" ? outputTab : svelteTab)?.focus();
  }

  function handleLessonTabs(event: KeyboardEvent): void {
    const index = lessonSurface === "output" ? 0 : 1;
    const next = nextRovingTabIndex(event.key, index, lessonSurfaces.length);
    if (next === null) return;
    event.preventDefault();
    selectLessonSurface(lessonSurfaces[next]!, true);
  }
</script>

<article class="guide getting-started-guide">
  <h1>Getting started</h1>
  <p class="lede">
    Twelve centuries of Kyoto cherry-blossom dates, from a scatter you can
    barely read to a chart that states what happened — one grammar element per
    step, on real data that ships with the package.
  </p>

  <h2 id="install">Install</h2>
  <p>Node.js 22 or newer, in an empty directory.</p>
  <CopyCode
    class="lesson-source"
    language="bash"
    accessibleLabel="Copy create command"
    code={`npx sv create my-chart --template minimal --types ts --no-add-ons --install npm\ncd my-chart\nnpm install @ggsvelte/svelte`}
  />

  <h2 id="draw-your-first-chart">Draw your first chart</h2>
  <p>
    <code>{`src/routes/+page.svelte`}</code>, in full. The 838 observations come
    from
    <code>@ggsvelte/svelte/data</code>, so there is nothing to download.
  </p>
  {#if lessonEnhanced}
    <div
      class="lesson-surface-tabs"
      role="tablist"
      aria-label="First chart surfaces"
    >
      <button
        id="first-output-tab"
        bind:this={outputTab}
        type="button"
        role="tab"
        aria-selected={lessonSurface === "output"}
        aria-controls="first-output-panel"
        tabindex={lessonSurface === "output" ? 0 : -1}
        onclick={() => selectLessonSurface("output")}
        onkeydown={handleLessonTabs}>Output</button
      >
      <button
        id="first-svelte-tab"
        bind:this={svelteTab}
        type="button"
        role="tab"
        aria-selected={lessonSurface === "svelte"}
        aria-controls="first-svelte-panel"
        tabindex={lessonSurface === "svelte" ? 0 : -1}
        onclick={() => selectLessonSurface("svelte")}
        onkeydown={handleLessonTabs}>Svelte</button
      >
    </div>
  {/if}
  <div
    class="first-result"
    data-enhanced={lessonEnhanced ? "true" : undefined}
    data-surface={lessonSurface}
  >
    <section
      id="first-output-panel"
      class="lesson-output"
      role={lessonEnhanced ? "tabpanel" : undefined}
      aria-labelledby={lessonEnhanced
        ? "first-output-tab"
        : "first-output-heading"}
    >
      <div class="lesson-label" id="first-output-heading">Output</div>
      <GGPlot
        spec={firstRender.spec}
        ariaLabel="Peak cherry-blossom dates in Kyoto, 812 to 2026, as an unstyled scatter"
      />
      <p>
        Twelve hundred years of spring, and the scatter says almost nothing.
        Every step below removes one reason for that.
      </p>
    </section>
    <section
      id="first-svelte-panel"
      class="lesson-code"
      role={lessonEnhanced ? "tabpanel" : undefined}
      aria-labelledby={lessonEnhanced
        ? "first-svelte-tab"
        : "first-code-heading"}
    >
      <div class="lesson-label" id="first-code-heading">Svelte</div>
      <CopyCode
        class="lesson-source lesson-source--file"
        language="svelte"
        accessibleLabel="Copy complete file"
        code={QUICKSTART_PAGE_SVELTE}
      />
    </section>
  </div>

  <h2 id="build-the-chart">Build the chart</h2>
  <p>
    Each step adds one element and re-renders the accumulated chart. Paste the
    fragment where it belongs in the file above; the finished file is at the
    end.
  </p>

  <div class="lesson-steps" bind:this={stepColumn}>
    {#each SAKURA_STEPS as step, index (step.id)}
      <section class="progressive-step" aria-labelledby={step.id}>
        <div class="step-copy">
          <h3 id={step.id}>{step.title}</h3>
          <p>{step.outcome}</p>
          <CopyCode
            class="lesson-source"
            language="svelte"
            accessibleLabel={`Copy ${step.title} fragment`}
            code={step.fragment}
          />
          <p>{step.explanation}</p>
          <a href={`${base}${step.href}`}>Read {step.chapterTitle}</a>
        </div>
        <div class="lesson-output" class:lesson-output--live={index === 5}>
          <GGPlot
            spec={accumulated[index]!.spec}
            key={accumulated[index]!.key}
            inspect={accumulated[index]!.inspect}
            ariaLabel={`Kyoto cherry blossom after step ${index + 1}: ${step.outcome}`}
          />
          {#if index >= 2}
            <p class="chart-note">Bands, left to right: {epochNames}.</p>
          {/if}
        </div>
      </section>
    {/each}
  </div>

  <h2 id="the-chart">The chart</h2>
  <p>
    The same accumulated spec, with room to breathe. Hover it, or tab into it:
    every one of the 838 observations answers.
  </p>
  <div class="finished-chart lesson-output">
    <GGPlot
      spec={finished.spec}
      key={finished.key}
      inspect={finished.inspect}
      ariaLabel={`Kyoto cherry blossom, finished. Called out: ${recordNames}.`}
    />
    <p class="chart-note">
      Bands, left to right: {epochNames}. Called out: {recordNames}.
    </p>
  </div>

  <h2 id="the-finished-file">The finished file</h2>
  <p>
    Every fragment above, in place. This is the whole chart — no build step, no
    wrapper component, no escape hatch.
  </p>
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
      <a href={`${base}/guide/themes-color`}>Color scales</a> — categorical schemes,
      sequential ramps, manual palettes.
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
    <li><a href={`${base}/guide/interactions`}>Interaction</a></li>
    <li><a href={`${base}/guide/compatibility`}>Compatibility</a></li>
  </ul>
</article>

<style>
  .lede {
    color: var(--muted);
    font-size: 1.08rem;
  }

  .lesson-surface-tabs {
    display: none;
  }

  .first-result,
  .progressive-step {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    margin: 1.5rem 0 3rem;
    border-block: 1px solid var(--line);
  }

  .first-result > section,
  .progressive-step > div {
    min-width: 0;
    padding: 1rem;
  }

  .first-result > section + section,
  .progressive-step > div + div {
    border-left: 1px solid var(--line);
  }

  .lesson-output {
    min-width: 0;
    overflow: hidden;
    background: #fff;
    color: #172033;
  }

  /*
   * The inspect step gains a tooltip and a pinned-value rail on hydration.
   * Reserving the space here keeps the page from moving under the reader.
   */
  .lesson-output--live {
    min-height: 30rem;
  }

  .lesson-output p {
    margin: 0.75rem 0 0;
    color: #5e6878;
    font-size: 0.82rem;
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
   * Translucent band fills do not survive forced-colors mode. The epoch
   * boundaries are drawn as hairline rules and the names live in the note
   * under each chart, so nothing is carried by fill alone.
   */
  @media (forced-colors: active) {
    .lesson-output :global(.gg-marks rect) {
      fill: none;
    }
  }

  @media (max-width: 63.99rem) {
    .lesson-surface-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-top: 1.5rem;
      border: 1px solid var(--line);
      border-bottom: 0;
    }

    .lesson-surface-tabs button {
      min-height: 44px;
      border: 0;
      background: var(--paper);
      color: var(--muted);
      font: 600 0.82rem/1 var(--body-font);
      cursor: pointer;
    }

    .lesson-surface-tabs button + button {
      border-left: 1px solid var(--line);
    }

    .lesson-surface-tabs button[aria-selected="true"] {
      background: var(--wash);
      color: var(--ink);
      box-shadow: inset 0 -2px 0 var(--accent);
    }

    .first-result[data-enhanced="true"] {
      margin-top: 0;
    }

    .first-result[data-enhanced="true"][data-surface="output"] .lesson-code,
    .first-result[data-enhanced="true"][data-surface="svelte"] .lesson-output {
      display: none;
    }

    .first-result,
    .progressive-step {
      grid-template-columns: 1fr;
    }

    .first-result > section + section,
    .progressive-step > div + div {
      border-top: 1px solid var(--line);
      border-left: 0;
    }

    .progressive-step .step-copy {
      order: 2;
    }

    .progressive-step .lesson-output {
      order: 1;
    }
  }
</style>
