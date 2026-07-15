<script lang="ts">
  import { GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { traffic } from "./data.js";
</script>

<GGPlot
  data={traffic}
  aes={{ x: "date", y: "users" }}
  scales={{ x: { type: "time" }, y: { zero: true } }}
  labs={{ title: "Daily active users, Q1 2026", x: "Date", y: "Users" }}
  width={640}
  height={400}
>
  <GeomLine linewidth={1.5} />
</GGPlot>
