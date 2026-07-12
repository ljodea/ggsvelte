<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "ggsvelte";

  import { trend } from "./data.js";
</script>

<GGPlot
  data={trend}
  aes={{ x: "dose", y: "effect" }}
  labs={{
    title: "Dose response with a loess trend",
    x: "Dose",
    y: "Effect",
  }}
  width={640}
  height={400}
>
  <GeomPoint alpha={0.55} size={2.5} />
  <GeomSmooth method="loess" span={0.75} />
</GGPlot>
