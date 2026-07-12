<script lang="ts">
  import { GeomErrorbar, GeomPoint, GGPlot } from "ggsvelte";

  import { yields } from "./data.js";
</script>

<GGPlot
  data={yields}
  aes={{ x: "treatment", y: "yield_" }}
  labs={{
    title: "Yield by treatment (mean ± standard error)",
    x: "Treatment",
    y: "Yield",
  }}
  width={640}
  height={400}
>
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.12, height: 0, seed: 7 }}
    alpha={0.35}
    size={2}
  />
  <GeomErrorbar stat="summary" width={0.35} linewidth={1.5} />
</GGPlot>
