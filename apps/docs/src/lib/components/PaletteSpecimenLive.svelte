<script lang="ts">
  import {
    GeomCol,
    GGPlot,
    Guides,
    Labs,
    Scale,
    Theme,
  } from "@ggsvelte/svelte";
  import type { CATEGORICAL_SCHEME_NAMES, ThemeName } from "@ggsvelte/spec";

  import { languages } from "$lib/theme-specimens/data";

  type CategoricalSchemeName = (typeof CATEGORICAL_SCHEME_NAMES)[number];

  const {
    name,
    label,
    reverse,
    paperTheme,
    height,
  }: {
    name: CategoricalSchemeName;
    label: string;
    reverse: boolean;
    paperTheme: ThemeName;
    height: number;
  } = $props();
</script>

<GGPlot
  data={languages}
  aes={{ x: "language", y: "respondents", fill: "language" }}
  inspect={{ mode: "exact" }}
  {height}
  ariaLabel={`${label} palette on ${paperTheme} paper`}
>
  <Theme name={paperTheme} />
  <Scale value={{ fill: { type: "ordinal", scheme: name, reverse } }} />
  <Guides value={{ fill: { type: "none" } }} />
  <Labs title="Spanish Armada squadron tonnage, 1588" x="Squadron" y="Tons" />
  <GeomCol width={0.75} />
</GGPlot>
