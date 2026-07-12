<script lang="ts">
  import type { PortableSpec, RenderModel } from "../../src/lib/index.js";
  import GGPlot from "../../src/lib/GGPlot.svelte";
  import GeomLine from "../../src/lib/GeomLine.svelte";
  import GeomPoint from "../../src/lib/GeomPoint.svelte";

  interface Row {
    x: number;
    y: number;
    cls: string;
  }

  const {
    data,
    alpha = 0.8,
    onrender,
  }: {
    data: Row[];
    alpha?: number;
    onrender?: (model: RenderModel, spec: PortableSpec) => void;
  } = $props();
</script>

<GGPlot
  {data}
  aes={{ x: "x", y: "y", color: "cls" }}
  width={480}
  height={320}
  {onrender}
>
  <GeomPoint size={3} {alpha} />
  <GeomLine aes={{ color: null }} linewidth={2} />
</GGPlot>
