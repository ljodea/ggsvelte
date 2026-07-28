<script lang="ts">
  import {
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorDiscrete,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { penguins } from "./data.js";
</script>

<GGPlot
  data={penguins}
  aes={{ x: "bill", y: "flipper", color: "species" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleColorDiscrete scheme="tableau10" />
  <Labs
    title="Three penguins, three ellipses"
    subtitle="95% bivariate normal rings around each species at Palmer Station"
    x="Bill length (mm)"
    y="Flipper length (mm)"
    color="Species"
  />
  <GeomPoint alpha={0.6} size={2.4} />
  <GeomPath stat="ellipse" level={0.95} segments={51} linewidth={1.5} />
</GGPlot>
