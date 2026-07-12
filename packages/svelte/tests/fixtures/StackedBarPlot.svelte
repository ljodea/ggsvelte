<script lang="ts">
  /** Children-sugar fixture: stacked col chart with a rule and text labels. */
  import type {
    DataInput,
    PortableSpec,
    RenderModel,
  } from "../../src/lib/index.js";
  import GGPlot from "../../src/lib/GGPlot.svelte";
  import GeomCol from "../../src/lib/GeomCol.svelte";
  import GeomRule from "../../src/lib/GeomRule.svelte";

  const {
    data,
    onrender,
  }: {
    data: DataInput;
    onrender?: (model: RenderModel, spec: PortableSpec) => void;
  } = $props();
</script>

<GGPlot
  {data}
  aes={{ x: "city", y: "sales", fill: "kind" }}
  labs={{ fill: "Channel" }}
  width={480}
  height={320}
  {onrender}
>
  <GeomCol width={0.8} />
  <GeomRule yintercept={40} />
</GGPlot>
