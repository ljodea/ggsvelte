<script lang="ts">
  import { CATEGORICAL_PALETTES } from "$lib/catalog/themes";
  import PaletteSpecimen from "$lib/components/PaletteSpecimen.svelte";

  let reverse = $state(false);
  let paperTheme = $state<"light" | "dark">("light");
</script>

<section class="palette-gallery" aria-label="Categorical palettes">
  <header class="section-heading">
    <div>
      <p class="eyebrow">Categorical</p>
      <h2>Palettes</h2>
    </div>
    <div class="controls">
      <div class="select-control">
        <label for="palette-paper">Chart paper</label>
        <select id="palette-paper" bind:value={paperTheme}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <label class="check-control">
        <input type="checkbox" bind:checked={reverse} />
        <span>Reverse</span>
      </label>
    </div>
  </header>

  <ol aria-label="Categorical palettes">
    {#each CATEGORICAL_PALETTES as palette (palette.name)}
      <li>
        <PaletteSpecimen
          name={palette.name}
          label={palette.label}
          colors={palette.colors}
          capacity={palette.capacity}
          {reverse}
          {paperTheme}
        />
      </li>
    {/each}
  </ol>
</section>

<style>
  .palette-gallery {
    padding-block: clamp(2.5rem, 6vw, 4.5rem);
    border-top: 1px solid var(--line);
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
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

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.25rem;
    align-items: end;
  }

  .select-control {
    display: grid;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 650;
  }

  select {
    min-width: 9rem;
    min-height: 44px;
    padding: 0.6rem;
    border: 1px solid var(--line-strong, var(--line));
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }

  .check-control {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    min-height: 44px;
    font-size: 0.86rem;
    font-weight: 600;
  }

  .check-control input {
    width: 1.15rem;
    height: 1.15rem;
  }

  ol {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ol > li {
    min-width: 0;
  }

  @media (max-width: 50rem) {
    ol {
      grid-template-columns: 1fr;
    }
  }
</style>
