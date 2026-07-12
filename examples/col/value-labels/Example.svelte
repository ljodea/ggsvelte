<script lang="ts">
  import { GeomCol, GeomText, GGPlot } from "ggsvelte";

  import { revenue } from "./data.js";
</script>

<GGPlot
  data={revenue}
  aes={{ x: "quarter", y: "amount" }}
  labs={{
    title: "Quarterly revenue",
    x: "Quarter",
    y: "Revenue (€ thousands)",
  }}
  width={640}
  height={400}
>
  <GeomCol width={0.7} />
  <GeomText aes={{ label: "label" }} dy={-8} size={11} />
</GGPlot>
