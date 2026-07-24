<script lang="ts">
  import { GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { britishExports } from "./data.js";
</script>

<GGPlot
  data={britishExports}
  aes={{ x: "year", y: "value" }}
  theme="fivethirtyeight"
  labs={{
    title: "British and Irish exports, 1855–1899",
    subtitle: "Raw four-digit strings infer a calendar scale",
    x: "Year",
    y: "£ millions",
  }}
  width="container"
  height={400}
>
  <GeomLine linewidth={1.5} />
</GGPlot>
