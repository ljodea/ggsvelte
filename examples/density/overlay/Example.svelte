<script lang="ts">
  import { GeomDensity, GGPlot } from "@ggsvelte/svelte";

  import { galtonChildren } from "./data.js";
</script>

<GGPlot
  data={galtonChildren}
  aes={{ x: "height", fill: "gender" }}
  theme="minimal"
  scales={{
    fill: {
      type: "manual",
      domain: ["Daughters", "Sons"],
      range: ["#8b7ec8", "#3aa99f"],
    },
  }}
  labs={{
    title: "Heights of Galton's 934 adult children",
    subtitle: "Two overlapping distributions, separated at the means",
    x: "Height (inches)",
    y: "Density",
    fill: "Child",
  }}
  width={640}
  height={400}
>
  <GeomDensity alpha={0.45} />
</GGPlot>
