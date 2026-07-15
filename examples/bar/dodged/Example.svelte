<script lang="ts">
  import { GeomBar, GGPlot } from "@ggsvelte/svelte";

  import { attendees } from "./data.js";
</script>

<GGPlot
  data={attendees}
  aes={{ x: "track", fill: "level" }}
  labs={{
    title: "Conference attendees by track and experience",
    x: "Track",
    y: "Attendees",
    fill: "Experience",
  }}
  width={640}
  height={400}
>
  <GeomBar position="dodge" />
</GGPlot>
