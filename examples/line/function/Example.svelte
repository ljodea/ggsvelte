<script lang="ts">
  import {
    GeomFunction,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { samples } from "./data.js";
</script>

<GGPlot data={samples} aes={{ x: "x" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Standard normal density"
    subtitle="geom_function evaluates a portable named function (dnorm) on a grid"
    x="x"
    y="density"
  />
  <GeomPoint aes={{ y: "y" }} size={2.5} alpha={0.55} />
  <GeomFunction
    fun="dnorm"
    n={201}
    xlim={[-3.5, 3.5]}
    args={{ mean: 0, sd: 1 }}
    linewidth={2}
    alpha={0.95}
  />
</GGPlot>
