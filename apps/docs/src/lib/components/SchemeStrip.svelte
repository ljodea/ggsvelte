<script lang="ts">
  const {
    colors,
    href,
    label,
  }: {
    colors: readonly string[];
    /** When set, the whole strip links out (e.g. chooser deep link). */
    href: string | null;
    label: string;
  } = $props();
</script>

{#snippet strip()}
  <span class="strip" role="img" aria-label={`${label} colors`}>
    {#each colors as color, index (`${color}-${String(index)}`)}
      <span class="cell" style={`--swatch:${color}`} title={color}></span>
    {/each}
  </span>
{/snippet}

{#if href !== null}
  <a class="strip-link" {href} aria-label={`Preview ${label} on a chart`}>
    {@render strip()}
  </a>
{:else}
  {@render strip()}
{/if}

<style>
  .strip {
    display: flex;
    width: 100%;
    min-width: 5rem;
    gap: 1px;
  }

  .cell {
    flex: 1 1 0;
    display: block;
    min-width: 0.25rem;
    height: 0.8rem;
    background: var(--swatch);
  }

  .strip-link {
    display: block;
  }

  .strip-link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
