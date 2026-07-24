<script lang="ts">
  import { GeomRaster, GGPlot } from "@ggsvelte/svelte";
  import type { ColorScaleSpec } from "@ggsvelte/spec";

  import { VIRIDIS_COLORS } from "$lib/catalog/themes";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import { RASTER_Z_DOMAIN } from "$lib/theme-specimens/catalog";
  import { grid } from "$lib/theme-specimens/data";
  import { SEQUENTIAL_RASTER_SNIPPET } from "$lib/theme-specimens/snippets";

  interface SequentialExample {
    label: string;
    scale: ColorScaleSpec;
  }

  const examples: readonly SequentialExample[] = [
    {
      label: "Viridis",
      scale: { type: "sequential", scheme: "viridis" },
    },
    {
      label: "Reversed",
      scale: { type: "sequential", scheme: "viridis", reverse: true },
    },
    {
      label: "Custom range",
      scale: {
        type: "sequential",
        range: ["#2d1e2f", "#3d5a80", "#e76f51"],
      },
    },
    {
      label: "Pinned domain",
      scale: {
        type: "sequential",
        scheme: "viridis",
        domain: [...RASTER_Z_DOMAIN],
      },
    },
  ];
</script>

<section class="sequential-lab" aria-label="Sequential color scales">
  <header class="section-heading">
    <div>
      <p class="eyebrow">Sequential</p>
      <h2>Ramps</h2>
    </div>
    <ol class="viridis-ramp" aria-label="Viridis reference colors">
      {#each VIRIDIS_COLORS as color, index (`${color}-${String(index)}`)}
        <li
          style={`--swatch:${color}`}
          aria-label={`${String(index + 1)}: ${color}`}
        ></li>
      {/each}
    </ol>
  </header>

  <p class="lede">
    Continuous fill on a density surface. Reverse, custom range, and pinned
    domain should read clearly on the colorbar — not only on a few dots.
  </p>

  <ol class="examples" aria-label="Sequential scale examples">
    {#each examples as example (example.label)}
      <li>
        <article>
          <header>
            <h3>{example.label}</h3>
          </header>
          <div class="plot-panel">
            <GGPlot
              data={grid}
              aes={{ x: "x", y: "y", fill: "z" }}
              scales={{ fill: example.scale }}
              theme="light"
              labs={{
                title: `${example.label} density surface`,
                x: "x",
                y: "y",
                fill: "z",
              }}
              inspect={{ mode: "xy" }}
              height={360}
              ariaLabel={`${example.label} sequential color example`}
            >
              <GeomRaster />
            </GGPlot>
          </div>
        </article>
      </li>
    {/each}
  </ol>

  <div class="section-code">
    <p class="fragment-label">Authoring fragment</p>
    <CopyCode
      code={SEQUENTIAL_RASTER_SNIPPET}
      language="svelte"
      accessibleLabel="Copy sequential raster authoring fragment"
    />
  </div>
</section>

<style>
  .sequential-lab {
    padding-block: clamp(2.5rem, 6vw, 4.5rem);
    border-top: 1px solid var(--line);
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .section-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem 2rem;
    min-width: 0;
    margin-bottom: 0.75rem;
  }

  h2 {
    margin: 0.2rem 0 0;
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .lede {
    margin: 0 0 1.5rem;
    max-width: 40rem;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .viridis-ramp {
    display: flex;
    width: min(100%, 18rem);
    height: 1.25rem;
    margin: 0;
    padding: 0;
    overflow: hidden;
    list-style: none;
  }

  .viridis-ramp li {
    flex: 1;
    background: var(--swatch);
  }

  .examples {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(2.5rem, 5vw, 4rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  article {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
  }

  .section-code {
    width: min(100%, 52rem);
    margin-top: clamp(2rem, 4vw, 3rem);
  }

  .fragment-label {
    margin: 0 0 0.5rem;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 650;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
</style>
