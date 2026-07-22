<script lang="ts">
  import { GeomPoint, GeomRect, GeomText, GGPlot } from "@ggsvelte/svelte";

  import { bands, callouts, observations } from "./data.js";
</script>

<GGPlot
  labs={{
    title: "Per-layer data: observations, bands, and a callout",
    x: "x",
    y: "y",
    color: "Group",
    fill: "Region",
  }}
  width={640}
  height={400}
>
  <GeomRect
    data={bands}
    aes={{
      xmin: "xmin",
      xmax: "xmax",
      ymin: "ymin",
      ymax: "ymax",
      fill: "region",
    }}
    alpha={0.2}
  />
  <GeomPoint
    data={observations}
    aes={{ x: "x", y: "y", color: "group" }}
    size={2.5}
    alpha={0.85}
  />
  <GeomText
    data={callouts}
    aes={{ x: "x", y: "y", label: "label" }}
    size={12}
  />
</GGPlot>
