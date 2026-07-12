<script lang="ts">
  import { GeomBar, GGPlot } from "ggsvelte";

  import { tickets } from "./data.js";
</script>

<GGPlot
  data={tickets}
  aes={{ x: "day", fill: "channel" }}
  labs={{
    title: "Support tickets by weekday",
    x: "Weekday",
    y: "Tickets",
    fill: "Channel",
  }}
  width={640}
  height={400}
>
  <GeomBar />
</GGPlot>
