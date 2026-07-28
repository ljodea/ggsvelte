<script lang="ts">
  import { base } from "$app/paths";
  import { KNOWN_GEOMS, KNOWN_STATS } from "@ggsvelte/spec";

  import { segmentReferenceLede } from "$lib/reference-lede";

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

  const known = {
    geoms: new Set<string>(KNOWN_GEOMS),
    stats: new Set<string>(KNOWN_STATS),
  };

  const segments = $derived(segmentReferenceLede(text, known));
</script>

<p class="lede">
  {#each segments as seg, i (i)}
    {#if seg.kind === "link"}
      <a href={`${base}${seg.href}`}><code>{seg.label}</code></a>
    {:else}
      {seg.value}
    {/if}
  {/each}
</p>

<style>
  .lede {
    max-width: 44rem;
    margin: 0 0 1.5rem;
    font-size: 1.05rem;
  }

  .lede a {
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }
</style>
