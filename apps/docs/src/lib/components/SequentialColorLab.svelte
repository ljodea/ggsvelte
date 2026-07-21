<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ColorScaleSpec } from "@ggsvelte/spec";

  import { VIRIDIS_COLORS } from "$lib/catalog/themes";
  import CopyCode from "$lib/components/CopyCode.svelte";

  interface SequentialExample {
    label: string;
    note: string;
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
      note: "Perceptually ordered from low to high.",
      scale: { type: "sequential", scheme: "viridis" },
      setting: 'scheme: "viridis"',
    },
    {
      label: "Reversed viridis",
      note: "Keep the scale; reverse its visual direction.",
      scale: { type: "sequential", scheme: "viridis", reverse: true },
      setting: 'scheme: "viridis", reverse: true',
    },
    {
      label: "Custom range",
      note: "Use supported hex stops for a publication-specific ramp.",
      scale: { type: "sequential", range: ["#2d1e2f", "#3d5a80", "#e76f51"] },
      setting: 'range: ["#2d1e2f", "#3d5a80", "#e76f51"]',
    },
    {
      label: "Pinned domain",
      note: "Hold the meaning of color steady across changing data.",
      scale: { type: "sequential", scheme: "viridis", domain: [0, 100] },
      setting: 'scheme: "viridis", domain: [0, 100]',
    },
  ];

  function snippet(example: SequentialExample): string {
    return `<GGPlot\n  data={rows}\n  aes={{ x: "sequence", y: "score", color: "intensity" }}\n  scales={{ color: { ${example.setting} } }}\n>\n  <GeomPoint size={4} />\n</GGPlot>`;
  }
</script>

<section class="sequential-lab" aria-label="Sequential color scales">
  <header class="section-heading">
    <div>
      <p class="eyebrow">Sequential</p>
      <h2>Ramps and domains</h2>
    </div>
    <div>
      <p>
        Order encoding. Reverse the ramp or pin <code>domain</code> when charts must
        share the same scale meaning.
      </p>
      <ol class="viridis-ramp" aria-label="Viridis reference colors">
        {#each VIRIDIS_COLORS as color, index (`${color}-${String(index)}`)}
          <li
            style={`--swatch:${color}`}
            aria-label={`${String(index + 1)}: ${color}`}
          ></li>
        {/each}
      </ol>
    </div>
  </header>

  <ol class="examples" aria-label="Sequential scale examples">
    {#each examples as example (example.label)}
      <li>
        <article>
          <header>
            <p>Sequential scale</p>
            <h3>{example.label}</h3>
            <span>{example.note}</span>
          </header>
          <div class="plot-paper">
            <GGPlot
              data={rows}
              aes={{ x: "sequence", y: "score", color: "intensity" }}
              scales={{ color: example.scale }}
              theme="light"
              height={265}
              ariaLabel={`${example.label} sequential color example`}
            >
              <GeomPoint size={4} />
            </GGPlot>
          </div>
          <p class="fragment-label">Svelte fragment</p>
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
    padding-block: clamp(4rem, 9vw, 8rem);
    border-top: 1px solid var(--line);
  }

  .eyebrow,
  article header p,
  .fragment-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .section-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.55fr);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
    min-width: 0;
    margin-bottom: 2rem;
  }

  h2 {
    max-width: min(10ch, 100%);
    min-width: 0;
    margin: 0.25rem 0 0;
    overflow-wrap: anywhere;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .section-heading > div:last-child > p,
  article header span {
    color: var(--muted);
  }

  .viridis-ramp {
    display: flex;
    height: 1.5rem;
    margin: 1rem 0 0;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    list-style: none;
  }

  .viridis-ramp li {
    flex: 1;
    background: var(--swatch);
  }

  .examples {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  article {
    min-width: 0;
    height: 100%;
    border: 1px solid var(--line);
    background: var(--paper);
  }

  article > header {
    min-height: 8.25rem;
    padding: 1rem;
  }

  h3 {
    margin: 0.2rem 0 0.55rem;
    font-size: 1.5rem;
  }

  article header span {
    font-size: 0.86rem;
  }

  .plot-paper {
    min-width: 0;
    overflow: hidden;
    border-block: 1px solid var(--line);
  }

  .fragment-label {
    padding: 0.75rem 1rem 0;
  }

  :global(.copy-code) {
    margin: 0.5rem 1rem 1rem;
  }

  @media (max-width: 50rem) {
    .section-heading,
    .examples {
      grid-template-columns: 1fr;
    }
  }
</style>
