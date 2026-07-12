<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "ggsvelte";

  import { temperatures } from "./data.js";
</script>

<GGPlot
  data={temperatures}
  aes={{ x: "month", y: "temp", color: "city" }}
  scales={{ x: { breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } }}
  labs={{
    title: "Monthly mean temperature",
    x: "Month",
    y: "Temperature (°C)",
    color: "City",
  }}
  width={640}
  height={400}
>
  <GeomLine linewidth={2} />
  <GeomPoint size={2.5} />
</GGPlot>
