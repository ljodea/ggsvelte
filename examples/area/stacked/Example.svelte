<script lang="ts">
  import { GeomArea, GGPlot } from "@ggsvelte/svelte";

  import { crimeanMortality } from "./data.js";
</script>

<GGPlot
  data={crimeanMortality}
  aes={{ x: "month", y: "deaths", fill: "cause" }}
  theme="economist"
  scales={{
    x: { labels: "%b %Y" },
    fill: {
      type: "manual",
      domain: ["Disease", "Wounds", "Other"],
      range: ["#d14d41", "#014d64", "#4385be"],
    },
  }}
  labs={{
    title: "Deaths in the Crimea, 1854–56",
    subtitle: "Annual rate per 1,000 — disease dwarfs combat, then collapses",
    x: "Month",
    y: "Deaths per 1,000 per year",
    fill: "Cause",
  }}
  width={640}
  height={400}
>
  <GeomArea alpha={0.9} />
</GGPlot>
