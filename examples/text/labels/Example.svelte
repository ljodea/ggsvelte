<script lang="ts">
  import { GeomPoint, GeomText, GGPlot } from "@ggsvelte/svelte";

  import { langren1644 } from "./data.js";
</script>

<GGPlot
  data={langren1644}
  aes={{ x: "longitude", y: "rank" }}
  theme="tufte"
  scales={{
    color: {
      type: "manual",
      domain: ["Astronomy", "Map"],
      range: ["#205ea6", "#a02f6f"],
    },
  }}
  labs={{
    title: "Every name on the first statistical graph",
    subtitle:
      "Van Langren, 1644 — the labels are the data: he named who got it wrong",
    x: "Estimated Toledo–Rome longitude (°)",
    y: "Ordered by estimate",
    color: "Derived from",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={3.5} aes={{ color: "source" }} />
  <GeomText aes={{ label: "name" }} anchor="start" dx={7} size={10} />
</GGPlot>
