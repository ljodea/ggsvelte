<script lang="ts">
  import { GeomErrorbar, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { soporifics } from "./data.js";
</script>

<GGPlot
  data={soporifics}
  aes={{ x: "drug", y: "extraSleep" }}
  theme="hrbr"
  scales={{
    x: { domain: ["Control", "L-hyoscyamine", "L-hyoscine", "DL-hyoscine"] },
  }}
  labs={{
    title: "The data the t-test was invented on",
    subtitle:
      "Cushny and Peebles, 1905: extra hours of sleep in eleven patients (mean ± se)",
    x: "Treatment",
    y: "Extra sleep (hours)",
  }}
  width={640}
  height={400}
>
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.12, height: 0, seed: 7 }}
    alpha={0.4}
    size={2.4}
  />
  <GeomErrorbar stat="summary" width={0.35} linewidth={1.5} />
</GGPlot>
