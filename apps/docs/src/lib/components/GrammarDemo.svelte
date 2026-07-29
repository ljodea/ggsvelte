<script lang="ts">
  import { onMount } from "svelte";

  /**
   * Homepage grammar section: chrome always SSR'd; plot upgrades from a static
   * SVG shell (server-rendered) to live GGPlot after a dynamic import so the
   * mid-page never sits empty while ~1.3MB of @ggsvelte downloads.
   */
  let {
    staticSvgLightSite,
    staticSvgDarkSite,
  }: {
    staticSvgLightSite: string;
    staticSvgDarkSite: string;
  } = $props();

  const steps = [
    { label: "Data", note: "Rows as plain objects." },
    { label: "Mappings", note: "aes for x, y, and color." },
    { label: "Layers", note: "GeomSmooth over GeomJitter." },
    { label: "Interaction", note: "just one more layer" },
  ] as const;
  let active = $state(steps.length - 1);
  let Plot = $state<
    typeof import("$lib/components/GrammarDemoPlot.svelte").default | null
  >(null);

  onMount(() => {
    void import("$lib/components/GrammarDemoPlot.svelte").then((mod) => {
      Plot = mod.default;
    });
  });
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
            disabled={Plot === null}
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
    {#if Plot !== null}
      <Plot {active} />
    {:else}
      <!--
        theme.js sets data-theme before paint. Mirror contrastChartTheme():
        fivethirtyeight on the light site, light chart on dark — no theme flash.
      -->
      <div class="grammar-static grammar-static--light-site">
        {@html staticSvgLightSite}
      </div>
      <div class="grammar-static grammar-static--dark-site">
        {@html staticSvgDarkSite}
      </div>
    {/if}
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

  .grammar-output :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .grammar-static--dark-site {
    display: none;
  }

  :global(:root[data-theme="dark"]) .grammar-static--light-site {
    display: none;
  }

  :global(:root[data-theme="dark"]) .grammar-static--dark-site {
    display: block;
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

  button:disabled {
    cursor: default;
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

  button:hover:not(:disabled) strong {
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
