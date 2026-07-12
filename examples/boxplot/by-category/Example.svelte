<script lang="ts">
  import { GeomBoxplot, GGPlot } from "ggsvelte";

  import { readings } from "./data.js";
</script>

<GGPlot
  data={readings}
  aes={{ x: "instrument", y: "value" }}
  labs={{
    title: "Reading spread by instrument",
    x: "Instrument",
    y: "Reading",
  }}
  width={640}
  height={400}
>
  <GeomBoxplot />
</GGPlot>
