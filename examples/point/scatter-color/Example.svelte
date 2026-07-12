<script lang="ts">
  import { GeomPoint, GGPlot } from "ggsvelte";

  import { penguins } from "./data.js";
</script>

<GGPlot
  data={penguins}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  labs={{
    title: "Penguin flippers vs body mass",
    x: "Flipper length (mm)",
    y: "Body mass (g)",
    color: "Species",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={3.5} alpha={0.85} />
</GGPlot>
