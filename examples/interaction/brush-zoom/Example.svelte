<script lang="ts">
  import { GeomPoint, GGPlot } from "ggsvelte";

  import { field } from "./data.js";
</script>

<!-- zoom implies the brush: a finished drag inverts the brushed rect
     through the trained scales into explicit continuous domains (an
     intentional respec). prevScales flow through the commit path, so the
     group colors NEVER shift while zooming. Double-click resets. -->
<GGPlot
  data={field}
  aes={{ x: "x", y: "y", color: "group" }}
  zoom={true}
  tooltip={true}
  labs={{
    title: "Drag to zoom, double-click to reset",
    x: "x",
    y: "y",
    color: "Group",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={2.5} alpha={0.8} />
</GGPlot>
