<script lang="ts">
  import { GeomBar, GGPlot } from "@ggsvelte/svelte";

  import { armadaCrews } from "./data.js";
</script>

<GGPlot
  data={armadaCrews}
  aes={{ x: "squadron", fill: "role", weight: "men" }}
  theme="fivethirtyeight"
  scales={{
    y: { labels: ".0%" },
    fill: {
      type: "manual",
      domain: ["Soldiers", "Sailors"],
      range: ["#c14a3d", "#3c6e8f"],
    },
  }}
  labs={{
    title: "Who sailed with the Armada, 1588",
    subtitle:
      "Soldiers outnumber sailors everywhere except the galleys and the light pataches",
    x: "Squadron",
    y: "Share of complement",
    fill: "Role",
  }}
  width={640}
  height={400}
>
  <GeomBar position="fill" />
</GGPlot>
