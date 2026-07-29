<script lang="ts">
  import type { ScaleSwatch } from "$lib/catalog/scale-swatches";

  const { swatch }: { swatch: ScaleSwatch } = $props();
</script>

<figure class="scale-swatch" data-kind={swatch.kind}>
  <ul class="strip" aria-label={swatch.caption}>
    {#each swatch.colors as color, index (`${color}-${String(index)}`)}
      <li
        style={`--swatch:${color}`}
        title={color}
        aria-label={`${String(index + 1)}: ${color}`}
      >
        <span aria-hidden="true"></span>
      </li>
    {/each}
  </ul>
  <figcaption>{swatch.caption}</figcaption>
</figure>

<style>
  .scale-swatch {
    margin: 1rem 0 1.5rem;
    max-width: 40rem;
  }

  .strip {
    display: flex;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    overflow-x: auto;
    list-style: none;
    border-radius: 0.35rem;
    border: 1px solid var(--line);
  }

  .scale-swatch[data-kind="discrete"] .strip {
    gap: 2px;
    background: var(--paper, transparent);
    border: none;
  }

  .strip li {
    flex: 1 1 0;
    min-width: 1.1rem;
  }

  .strip span {
    display: block;
    height: 1.75rem;
    background: var(--swatch);
  }

  .scale-swatch[data-kind="discrete"] .strip span {
    height: 1.5rem;
    border-radius: 2px;
  }

  .scale-swatch[data-kind="ramp"] .strip li:first-child span {
    border-radius: 0.3rem 0 0 0.3rem;
  }

  .scale-swatch[data-kind="ramp"] .strip li:last-child span {
    border-radius: 0 0.3rem 0.3rem 0;
  }

  figcaption {
    margin-top: 0.4rem;
    color: var(--muted);
    font-size: 0.82rem;
  }
</style>
