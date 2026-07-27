<script lang="ts">
  import { GeomCount, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { overplotSample } from "./data.js";
</script>

<GGPlot
  data={overplotSample}
  aes={{ x: "x", y: "y", color: "species" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Overplotting counts"
    subtitle="geom_count — size is after_stat n at unique (x, y)"
    x="x"
    y="y"
    color="Species"
    size="n"
  />
  <GeomCount alpha={0.75} />
</GGPlot>
