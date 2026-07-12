<script lang="ts">
  import { GeomBar, GGPlot } from "ggsvelte";

  import { sessions } from "./data.js";
</script>

<GGPlot
  data={sessions}
  aes={{ x: "age", fill: "genre" }}
  scales={{ y: { labels: ".0%" } }}
  legend={{ order: "sorted" }}
  labs={{
    title: "What each age group streams",
    x: "Age group",
    y: "Share of sessions",
    fill: "Genre",
  }}
  width={640}
  height={400}
>
  <GeomBar position="fill" />
</GGPlot>
