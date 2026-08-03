<script lang="ts">
  import { SEQUENTIAL_RAMP_ROWS } from "$lib/catalog/sequential-ramps";
</script>

<ol class="ramps" aria-label="Sequential color schemes">
  {#each SEQUENTIAL_RAMP_ROWS as row (row.name)}
    <li>
      <code class="name">{row.name}</code>
      <span class="strip" role="list" aria-label={`${row.name} ramp colors`}>
        {#each row.colors as color, index (`${color}-${String(index)}`)}
          <span
            class="cell"
            role="listitem"
            style={`--swatch:${color}`}
            title={color}
            aria-label={`${String(index + 1)}: ${color}`}
          ></span>
        {/each}
      </span>
    </li>
  {/each}
</ol>

<style>
  .ramps {
    display: grid;
    gap: 0.55rem 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
    align-content: start;
  }

  .name {
    font-size: 0.8rem;
  }

  .strip {
    display: flex;
    min-width: 0;
    gap: 1px;
  }

  .cell {
    flex: 1 1 0;
    display: block;
    min-width: 0.4rem;
    height: 0.9rem;
    background: var(--swatch);
  }
</style>
