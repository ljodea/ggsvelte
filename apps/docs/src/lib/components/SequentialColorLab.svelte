<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ColorScaleSpec } from "@ggsvelte/spec";

  import { VIRIDIS_COLORS } from "$lib/catalog/themes";
  import CopyCode from "$lib/components/CopyCode.svelte";

  interface SequentialExample {
    label: string;
    scale: ColorScaleSpec;
    setting: string;
  }

  const rows = [
    { sequence: 1, score: 18, intensity: 0 },
    { sequence: 2, score: 28, intensity: 20 },
    { sequence: 3, score: 39, intensity: 40 },
    { sequence: 4, score: 53, intensity: 60 },
    { sequence: 5, score: 67, intensity: 80 },
    { sequence: 6, score: 82, intensity: 100 },
  ];

  const examples: readonly SequentialExample[] = [
    {
      label: "Viridis",
      scale: { type: "sequential", scheme: "viridis" },
      setting: 'scheme: "viridis"',
    },
    {
      label: "Reversed",
      scale: { type: "sequential", scheme: "viridis", reverse: true },
      setting: 'scheme: "viridis", reverse: true',
    },
    {
      label: "Custom range",
      scale: { type: "sequential", range: ["#2d1e2f", "#3d5a80", "#e76f51"] },
      setting: 'range: ["#2d1e2f", "#3d5a80", "#e76f51"]',
    },
    {
      label: "Pinned domain",
      scale: { type: "sequential", scheme: "viridis", domain: [0, 100] },
      setting: 'scheme: "viridis", domain: [0, 100]',
    },
  ];

  function snippet(example: SequentialExample): string {
    return `<GGPlot
  data={rows}
  aes={{ x: "sequence", y: "score", color: "intensity" }}
  scales={{ color: { ${example.setting} } }}
>
  <GeomPoint size={4} />
</GGPlot>`;
  }
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

  <ol class="examples" aria-label="Sequential scale examples">
    {#each examples as example (example.label)}
      <li>
        <article>
          <header>
            <h3>{example.label}</h3>
          </header>
          <div class="plot">
            <GGPlot
              data={rows}
              aes={{ x: "sequence", y: "score", color: "intensity" }}
              scales={{ color: example.scale }}
              theme="light"
              height={280}
              ariaLabel={`${example.label} sequential color example`}
            >
              <GeomPoint size={4} />
            </GGPlot>
          </div>
          <CopyCode
            code={snippet(example)}
            language="svelte"
            accessibleLabel={`Copy ${example.label} code`}
          />
        </article>
      </li>
    {/each}
  </ol>
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
    margin-bottom: 1.5rem;
  }

  h2 {
    margin: 0.2rem 0 0;
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    line-height: 1;
    letter-spacing: -0.02em;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  article {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  .plot {
    min-width: 0;
  }

  @media (max-width: 50rem) {
    .examples {
      grid-template-columns: 1fr;
    }
  }
</style>
