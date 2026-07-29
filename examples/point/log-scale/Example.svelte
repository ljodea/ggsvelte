<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorManual,
    ScaleXLog10,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { londonCholera } from "./data.js";
</script>

<GGPlot
  data={londonCholera}
  aes={{ x: "density", y: "deathRate", color: "water" }}
  key="district"
  legendFocus
  inspect={{ mode: "xy", pin: true }}
  width="container"
  height={400}
>
  <ThemeEconomist />
  <ScaleXLog10 labels="~s" />
  <ScaleColorManual
    domain={["Battersea", "New River", "Kew"]}
    values={["#d14d41", "#014d64", "#4385be"]}
  />
  <Labs
    title="Cholera, crowding and water in London, 1849"
    subtitle="Death rate against population density, by water company"
    x="People per acre (log scale)"
    y="Cholera deaths per 10,000"
    color="Water supply"
  />
  <GeomPoint size={3.5} />
</GGPlot>
