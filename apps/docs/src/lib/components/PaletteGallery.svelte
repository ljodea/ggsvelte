<script lang="ts">
  import { CATEGORICAL_PALETTES } from "$lib/catalog/themes";
  import PaletteSpecimen from "$lib/components/PaletteSpecimen.svelte";

  let reverse = $state(false);
  let paperTheme = $state<"light" | "dark">("light");
</script>

<section class="palette-gallery" aria-label="Categorical color schemes">
  <header class="section-heading">
    <div>
      <p class="eyebrow">Categorical color</p>
      <h2>Keep identity stable and capacity explicit.</h2>
    </div>
    <div>
      <p>
        Named schemes preserve category identity across chart themes. Capacity
        tells you when a palette will repeat instead of pretending every
        category is unique.
      </p>
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
          <span>Reverse palettes</span>
        </label>
      </div>
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
    padding-block: clamp(4rem, 9vw, 8rem);
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
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.55fr);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
    margin-bottom: 2rem;
  }

  h2 {
    max-width: 12ch;
    margin: 0.25rem 0 0;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .section-heading > div:last-child > p {
    color: var(--muted);
  }

  .controls {
    display: grid;
    grid-template-columns: minmax(9rem, 1fr) minmax(10rem, 1fr);
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  .select-control {
    display: grid;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 650;
  }

  select {
    min-height: 44px;
    padding: 0.6rem;
    border: 1px solid var(--line-strong);
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
    padding-top: 1rem;
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
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ol > li {
    min-width: 0;
  }

  @media (max-width: 50rem) {
    .section-heading,
    ol {
      grid-template-columns: 1fr;
    }

    .controls {
      grid-template-columns: 1fr;
    }

    .check-control {
      padding-top: 0;
    }
  }
</style>
