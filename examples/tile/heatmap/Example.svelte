<script lang="ts">
  import { GeomTile, GGPlot, scaleFillContinuous } from "@ggsvelte/svelte";

  import { cholera1849 } from "./data.js";
</script>

<GGPlot
  data={cholera1849}
  aes={{ x: "week", y: "weekday", fill: "deaths" }}
  theme="dark"
  scales={{
    x: { type: "band" },
    y: {
      type: "band",
      domain: ["Sat", "Fri", "Thu", "Wed", "Tue", "Mon", "Sun"],
    },
    ...scaleFillContinuous({ scheme: "viridis" }),
  }}
  labs={{
    title: "Cholera in England and Wales, 1849",
    subtitle:
      "Registered deaths every day of the year; 53,293 in all, peaking at 1,121 on 6 September",
    x: "Week of 1849",
    y: "",
    fill: "Deaths",
  }}
  width={640}
  height={400}
>
  <GeomTile />
</GGPlot>
