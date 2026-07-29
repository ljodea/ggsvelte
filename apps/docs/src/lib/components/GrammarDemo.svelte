<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot, Theme } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";

  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";

  const steps = [
    { label: "Data", note: "Rows as plain objects." },
    { label: "Mappings", note: "aes for x, y, and color." },
    { label: "Layers", note: "GeomSmooth over GeomPoint." },
    { label: "Interaction", note: "just one more layer" },
  ] as const;
  let active = $state(steps.length - 1);
  const chartTheme = $derived(contrastChartTheme());
</script>

<section class="grammar-demo" aria-labelledby="grammar-heading">
  <div class="grammar-copy">
    <h2 id="grammar-heading">Declare a layer interactive</h2>
    <p>
      Zero D3.js. Headless SVG rendering for CLI, SSR environments, &amp; agent
      validation loops.
    </p>
    <ol>
      {#each steps as step, index (step.label)}
        <li class:active={active === index}>
          <button
            type="button"
            aria-pressed={active === index}
            onclick={() => (active = index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.label}</strong>
            <small>{step.note}</small>
          </button>
        </li>
      {/each}
    </ol>
  </div>
  <div class="grammar-output">
    <!--
      Exact inspect (not auto/x): smooth layers auto-mode to "x" and draw a
      vertical guide that steals hits from points. Homepage needs point
      tooltips only. Full palmerPenguins (333 complete cases) — not the
      30-row theme-specimen subset.
    -->
    <GGPlot
      data={palmerPenguins}
      aes={{
        x: "flipperLengthMm",
        y: "bodyMassG",
        ...(active >= 1 && { color: "species" }),
      }}
      inspect={active >= 3
        ? { mode: "exact", pin: true, maxDistance: 24 }
        : false}
      ariaLabel="Penguin body mass increases with flipper length, grouped by species"
    >
      <Theme name={chartTheme} />
      <GeomPoint alpha={0.72} />
      {#if active >= 2}
        <GeomSmooth method="loess" span={0.75} se={false} />
      {/if}
    </GGPlot>
  </div>
</section>

<style>
  /*
   * Chart owns the wide column on the left; title + step accordion stay narrow
   * on the right. Source order keeps copy first for mobile stack / a11y.
   */
  .grammar-demo {
    display: grid;
    grid-template-areas: "output copy";
    grid-template-columns: minmax(0, 1.55fr) minmax(12rem, 0.5fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: center;
    padding-block: clamp(4rem, 9vw, 8rem);
    border-block: 1px solid var(--line);
  }

  .grammar-copy {
    grid-area: copy;
  }

  .grammar-output {
    grid-area: output;
    min-width: 0;
  }

  h2 {
    max-width: 11ch;
    margin: 0.25rem 0 1rem;
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    line-height: 0.95;
  }

  .grammar-copy > p {
    max-width: 28rem;
    color: var(--muted);
  }

  ol {
    margin: 2rem 0 0;
    padding: 0;
    border-top: 1px solid var(--line);
    list-style: none;
  }

  li {
    border-bottom: 1px solid var(--line);
  }

  button {
    display: grid;
    grid-template-columns: 2rem 1fr;
    width: 100%;
    min-height: 64px;
    padding: 0.75rem 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--muted);
    text-align: left;
    cursor: pointer;
  }

  button > span {
    grid-row: 1 / 3;
    font: 600 0.75rem/1.4 var(--code-font);
  }

  button strong {
    color: var(--ink);
    font-family: var(--display-font);
    font-size: 1.2rem;
  }

  button:hover strong {
    text-decoration: underline;
  }

  button small {
    opacity: 0;
    transition: opacity 120ms ease;
  }

  li.active button {
    color: var(--ink);
    box-shadow: inset 2px 0 0 var(--accent);
  }

  li.active button {
    padding-left: 0.75rem;
  }

  li.active button small {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    button small {
      transition: none;
    }
  }

  @media (max-width: 50rem) {
    .grammar-demo {
      grid-template-areas: "copy" "output";
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }
</style>
