<script lang="ts">
  import { GeomPoint, GGPlot } from "ggsvelte";

  import { penguins } from "./data.js";
</script>

<!-- tooltip is an adapter-level overlay: hover resolves through the plot's
     hit index (never a pipeline re-run) and the default content lists the
     hit layer's mapped fields. Interactions are excluded from VR shots;
     component tests cover them. -->
<GGPlot
  data={penguins}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  tooltip={true}
  labs={{
    title: "Hover a point for its values",
    x: "Flipper length (mm)",
    y: "Body mass (g)",
    color: "Species",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={4} alpha={0.85} />
</GGPlot>
