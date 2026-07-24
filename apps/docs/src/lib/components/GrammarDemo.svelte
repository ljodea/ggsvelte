<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";

  import { penguins } from "$examples/point/scatter-color/data";
  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";

  const steps = [
    { label: "Data", note: "Rows as plain objects." },
    { label: "Mappings", note: "aes for x, y, and color." },
    { label: "Layers", note: "GeomSmooth over GeomPoint." },
    { label: "Interaction", note: "inspect is a prop, not event plumbing." },
  ] as const;
  let active = $state(steps.length - 1);
  const chartTheme = $derived(contrastChartTheme());
</script>

<section class="grammar-demo" aria-labelledby="grammar-heading">
  <div class="grammar-copy">
    <h2 id="grammar-heading">Interaction is declarative.</h2>
    <p>
      The grammar you know from ggplot2, plus a step it never had. Mouse over
      the chart: inspection, pinning, selection, and zoom are spec fields.
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
    <GGPlot
      data={penguins}
      aes={{
        x: "flipper",
        y: "mass",
        ...(active >= 1 && { color: "species" }),
      }}
      inspect={active >= 3}
      theme={chartTheme}
      ariaLabel="Penguin mass increases with flipper length, grouped by species"
    >
      <GeomPoint alpha={0.72} />
      {#if active >= 2}<GeomSmooth method="loess" span={0.75} se={false} />{/if}
    </GGPlot>
  </div>
</section>

<style>
  .grammar-demo {
    display: grid;
    grid-template-columns: minmax(17rem, 0.8fr) minmax(0, 1.2fr);
    gap: clamp(2rem, 6vw, 6rem);
    align-items: center;
    padding-block: clamp(4rem, 9vw, 8rem);
    border-block: 1px solid var(--line);
  }

  h2 {
    max-width: 13ch;
    margin: 0.25rem 0 1rem;
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    line-height: 0.95;
  }

  .grammar-copy > p {
    max-width: 34rem;
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

  .grammar-output {
    min-width: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    button small {
      transition: none;
    }
  }

  @media (max-width: 50rem) {
    .grammar-demo {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }
</style>
