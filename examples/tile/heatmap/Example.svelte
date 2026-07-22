<script lang="ts">
  import { GeomTile, GGPlot } from "@ggsvelte/svelte";

  import { staffing } from "./data.js";
</script>

<GGPlot
  data={staffing}
  aes={{ x: "dept", y: "shift", fill: "n" }}
  labs={{
    title: "Staffing intensity by department and shift",
    x: "Department",
    y: "Shift",
  }}
  width={640}
  height={400}
>
  <GeomTile />
</GGPlot>
