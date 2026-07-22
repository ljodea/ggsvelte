<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";
  import { CATEGORICAL_SCHEME_NAMES } from "@ggsvelte/spec";

  import CopyCode from "$lib/components/CopyCode.svelte";

  type SchemeName = (typeof CATEGORICAL_SCHEME_NAMES)[number];

  const {
    name,
    label,
    scheme,
  }: {
    name: ThemeName;
    label: string;
    scheme: SchemeName;
  } = $props();

  const rows = [
    { release: 1, response: 18, group: "North" },
    { release: 2, response: 31, group: "North" },
    { release: 3, response: 43, group: "North" },
    { release: 4, response: 56, group: "North" },
    { release: 1, response: 27, group: "South" },
    { release: 2, response: 39, group: "South" },
    { release: 3, response: 52, group: "South" },
    { release: 4, response: 68, group: "South" },
  ];
  const code = $derived(
    `<GGPlot
  data={rows}
  aes={{ x: "release", y: "response", color: "group" }}
  theme="${name}"
  scales={{ color: { scheme: "${scheme}" } }}
>
  <GeomPoint size={3.5} />
</GGPlot>`,
  );
</script>

<article>
  <header>
    <h3>{label}</h3>
    <code>theme="{name}"</code>
  </header>
  <div class="plot">
    <GGPlot
      data={rows}
      aes={{ x: "release", y: "response", color: "group" }}
      theme={name}
      scales={{ color: { type: "ordinal", scheme } }}
      height={280}
      ariaLabel={`${label} theme with ${scheme} palette`}
    >
      <GeomPoint size={3.5} />
    </GGPlot>
  </div>
  <CopyCode
    {code}
    language="svelte"
    accessibleLabel={`Copy ${label} theme code`}
  />
</article>

<style>
  article {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  header > code {
    color: var(--muted);
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .plot {
    min-width: 0;
  }
</style>
