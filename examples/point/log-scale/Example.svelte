<script lang="ts">
  import { GeomPoint, GGPlot, scaleXLog10 } from "@ggsvelte/svelte";

  import { londonCholera } from "./data.js";
</script>

<GGPlot
  data={londonCholera}
  aes={{ x: "density", y: "deathRate", color: "water" }}
  theme="economist"
  scales={{
    ...scaleXLog10({ labels: "~s" }),
    color: {
      type: "manual",
      domain: ["Battersea", "New River", "Kew"],
      range: ["#d14d41", "#014d64", "#4385be"],
    },
  }}
  key="district"
  inspect={{ mode: "xy", pin: true }}
  labs={{
    title: "Cholera, crowding and water in London, 1849",
    subtitle: "Death rate against population density, by water company",
    x: "People per acre (log scale)",
    y: "Cholera deaths per 10,000",
    color: "Water supply",
  }}
  width="container"
  height={400}
>
  <GeomPoint size={3.5} />
</GGPlot>
