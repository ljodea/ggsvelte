<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { ratings } from "./data.js";
</script>

<GGPlot
  data={ratings}
  aes={{ x: "team", y: "score" }}
  labs={{
    title: "Score spread by team (seeded jitter)",
    x: "Team",
    y: "Score",
  }}
  width={640}
  height={400}
>
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.16, height: 0.12 }}
    alpha={0.45}
    size={2.5}
  />
</GGPlot>
