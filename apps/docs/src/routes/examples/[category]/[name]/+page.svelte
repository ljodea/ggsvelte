<script lang="ts">
  import { base } from "$app/paths";

  import CodeTabs from "$lib/CodeTabs.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const Example = $derived(data.component);
  const frameWidth = 640;
  const frameHeight = $derived(data.entry.vrHeight ?? 400);
  const tabs = $derived([
    { label: "Spec (JSON)", code: JSON.stringify(data.spec, null, 2) },
    { label: "Builder (TS)", code: data.specSource },
    { label: "Svelte", code: data.svelteSource },
  ]);
</script>

<svelte:head>
  <title>{data.entry.title} — ggsvelte examples</title>
  <meta name="description" content={data.entry.description} />
</svelte:head>

<article class="example-page">
  <!-- .example-prose is hidden in VR mode; the frame is what gets shot. -->
  <div class="example-prose">
    <p class="crumbs">
      <a href={`${base}/examples`}>Examples</a> / {data.entry.docsSection}
    </p>
    <h1>{data.entry.title}</h1>
    <p>{data.entry.description}</p>
  </div>

  <div
    class="gg-example-frame"
    style={`width:${String(frameWidth)}px;height:${String(frameHeight)}px`}
  >
    <Example />
  </div>

  <div class="example-prose">
    <CodeTabs {tabs} />
    <p class="tags">
      {#each data.entry.tags as tag (tag)}<span class="tag">{tag}</span>{/each}
    </p>
  </div>
</article>

<style>
  .crumbs {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .gg-example-frame {
    margin: 1.5rem 0;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .tag {
    font-size: 0.75rem;
    padding: 0.1rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
  }
</style>
