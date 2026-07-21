<script lang="ts">
  import { base } from "$app/paths";
  import { GeomLine, GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";
  import { onMount } from "svelte";

  import {
    QUICKSTART_BUILDER_FRAGMENT,
    QUICKSTART_CLI_FRAGMENT,
    QUICKSTART_HEADLESS_FRAGMENT,
    QUICKSTART_LESSON_STEPS,
    QUICKSTART_PAGE_SVELTE,
    QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  } from "$scripts/quickstart";

  import CopyCode from "./CopyCode.svelte";

  const cars = [
    { weight: 1.8, economy: 37 },
    { weight: 2.4, economy: 31 },
    { weight: 3.1, economy: 25 },
    { weight: 4, economy: 19 },
  ];
  let lessonEnhanced = $state(false);
  let lessonSurface = $state<"output" | "svelte">("output");
  let outputTab = $state<HTMLButtonElement>();
  let svelteTab = $state<HTMLButtonElement>();

  onMount(() => {
    lessonEnhanced = true;
  });

  function selectLessonSurface(
    surface: "output" | "svelte",
    focus = false,
  ): void {
    lessonSurface = surface;
    if (focus) (surface === "output" ? outputTab : svelteTab)?.focus();
  }

  function handleLessonTabs(event: KeyboardEvent): void {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      selectLessonSurface(
        lessonSurface === "output" ? "svelte" : "output",
        true,
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      selectLessonSurface("output", true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectLessonSurface("svelte", true);
    }
  }

  const lessonCars = [
    { id: "compact-1", weight: 1.8, economy: 37, vehicleClass: "Compact" },
    { id: "compact-2", weight: 2.1, economy: 34, vehicleClass: "Compact" },
    { id: "compact-3", weight: 2.4, economy: 31, vehicleClass: "Compact" },
    { id: "compact-4", weight: 2.7, economy: 29, vehicleClass: "Compact" },
    { id: "utility-1", weight: 2.8, economy: 28, vehicleClass: "Utility" },
    { id: "utility-2", weight: 3.2, economy: 25, vehicleClass: "Utility" },
    { id: "utility-3", weight: 3.6, economy: 22, vehicleClass: "Utility" },
    { id: "utility-4", weight: 4, economy: 19, vehicleClass: "Utility" },
  ];
</script>

<article class="guide getting-started-guide">
  <h1>Getting started</h1>
  <p class="lede">
    Install, render one chart from a Svelte file, then add aes, layers, scales,
    facets, theme, and inspect one step at a time.
  </p>

  <h2 id="create-a-sveltekit-app">Create a SvelteKit app</h2>
  <p>Start with Node.js 22 or newer in an empty directory.</p>
  <p class="guide-code-classification">Complete command</p>
  <CopyCode
    class="lesson-source"
    label="Copy create command"
    code={`npx sv create my-chart --template minimal --types ts --no-add-ons --install npm\ncd my-chart`}
  />

  <h2 id="install-ggsvelte">Install ggsvelte</h2>
  <p>Choose the package manager already used by the app.</p>
  <p class="guide-code-classification">Complete command</p>
  <CopyCode
    class="lesson-source"
    label="Copy install"
    code="npm install @ggsvelte/svelte"
  />

  <h2 id="draw-your-first-chart">Draw your first chart</h2>
  <p><code>src/routes/+page.svelte</code> (complete file)</p>
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
      <div class="lesson-label" id="first-output-heading">
        Output · real GGPlot
      </div>
      <GGPlot
        data={cars}
        aes={{ x: "weight", y: "economy" }}
        ariaLabel="Fuel economy decreases as vehicle weight increases"
      >
        <GeomPoint />
      </GGPlot>
      <p>
        Four rows become four points. Width follows the container; omitted
        height is 400px.
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
      <div class="lesson-label" id="first-code-heading">
        Svelte · complete file
      </div>
      <CopyCode
        class="lesson-source lesson-source--file"
        label="Copy complete file"
        code={QUICKSTART_PAGE_SVELTE}
      />
    </section>
  </div>

  <h2 id="you-have-a-chart">You have a chart</h2>
  <p>
    <code>GGPlot</code> owns the chart, <code>data</code> supplies rows,
    <code>aes</code>
    maps fields, and <code>GeomPoint</code> adds the first layer.
  </p>

  <h2 id="build-the-grammar-one-change-at-a-time">
    Build the grammar one change at a time
  </h2>
  {#each QUICKSTART_LESSON_STEPS as step, stepIndex (step.id)}
    <section class="progressive-step" aria-labelledby={step.id}>
      <div class="step-copy">
        <h3 id={step.id}>{step.title}</h3>
        <p>{step.outcome}</p>
        <p class="guide-code-classification">Fragment</p>
        <CopyCode
          class="lesson-source"
          label="Copy fragment"
          accessibleLabel={`Copy ${step.title} fragment`}
          code={step.fragment}
        />
        <p>{step.explanation}</p>
        <a href={`${base}${step.href}`}>Read {step.chapterTitle}</a>
      </div>
      <div class="lesson-output">
        <div class="lesson-label">Current accumulated result</div>
        <GGPlot
          data={lessonCars}
          aes={stepIndex >= 2
            ? { x: "weight", y: "economy", color: "vehicleClass" }
            : { x: "weight", y: "economy" }}
          scales={stepIndex >= 2
            ? { color: { type: "ordinal", scheme: "observable10" } }
            : undefined}
          facet={stepIndex >= 4 ? { wrap: "vehicleClass", ncol: 2 } : undefined}
          theme={stepIndex >= 5 ? "economist" : undefined}
          key={stepIndex >= 6 ? "id" : undefined}
          inspect={stepIndex >= 6 ? { mode: "exact", pin: true } : undefined}
          ariaLabel={`${step.title}: accumulated fuel economy lesson`}
        >
          {#if stepIndex >= 1}<GeomLine />{/if}
          <GeomPoint />
          {#if stepIndex >= 3}<GeomSmooth method="lm" />{/if}
        </GGPlot>
      </div>
    </section>
  {/each}

  <h2 id="choose-another-surface-only-when-you-need-it">
    Choose another surface only when you need it
  </h2>
  <p>
    After the first render, choose a secondary form only for a concrete job.
  </p>
  <h3 id="fluent-builder">Fluent builder</h3>
  <p>Use the builder to construct specs programmatically in TypeScript.</p>
  <p class="guide-code-classification">Fragment</p>
  <CopyCode
    class="lesson-source"
    label="Copy builder fragment"
    code={QUICKSTART_BUILDER_FRAGMENT}
  />
  <h3 id="portablespec-json">PortableSpec JSON</h3>
  <p>
    Use PortableSpec to save, transmit, validate, or generate a chart without
    executable accessors.
  </p>
  <p class="guide-code-classification">Fragment</p>
  <CopyCode
    class="lesson-source"
    label="Copy PortableSpec fragment"
    code={QUICKSTART_PORTABLE_SPEC_FRAGMENT}
  />

  <h2 id="headless-and-server-rendering">Headless and server rendering</h2>
  <p>
    <code>renderToSVGString</code> is the pure no-DOM path. The installed
    <code>ggsvelte-render</code> CLI writes SVG to stdout and JSON Lines diagnostics
    to stderr.
  </p>
  <p class="guide-code-classification">Fragment</p>
  <CopyCode
    class="lesson-source"
    label="Copy headless fragment"
    code={QUICKSTART_HEADLESS_FRAGMENT}
  />
  <p class="guide-code-classification">Fragment</p>
  <CopyCode
    class="lesson-source"
    label="Copy CLI fragment"
    code={QUICKSTART_CLI_FRAGMENT}
  />

  <h2 id="validating-specs">Validating specs</h2>
  <p>
    <code>validate(spec)</code> checks schema shape. Every validation error has a
    stable code, path, message, and fix.
  </p>

  <h2 id="where-next">Where next</h2>
  <ul>
    <li><a href={`${base}/examples`}>Examples</a></li>
    <li><a href={`${base}/guide/interactions`}>Interaction</a></li>
    <li><a href={`${base}/guide/compatibility`}>Compatibility</a></li>
    <li><a href={`${base}/guide/errors`}>Diagnostics</a></li>
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

  .lesson-output p {
    margin: 0.75rem 0 0;
    color: #5e6878;
    font-size: 0.82rem;
  }

  .lesson-label {
    margin-bottom: 0.75rem;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lesson-code,
  .step-copy {
    background: var(--wash);
  }

  .step-copy h3 {
    margin-top: 0;
  }

  .getting-started-guide :global(.lesson-source.copy-code) {
    grid-template-columns: minmax(0, 1fr) auto;
    max-height: 28rem;
    overflow: auto;
  }

  .getting-started-guide :global(.lesson-source code) {
    align-items: start;
    white-space: pre;
  }

  .progressive-step :global(.lesson-source.copy-code) {
    grid-template-columns: minmax(0, 1fr);
  }

  .progressive-step :global(.lesson-source.copy-code button) {
    grid-row: 2;
    grid-column: 1;
    border-top: 1px solid currentColor;
    border-left: 0;
  }

  .guide-code-classification {
    margin: 1rem 0 0.35rem;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
