<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { greatLakesSurveys, greatLakesTruth } from "./data.js";
</script>

<GGPlot
  data={greatLakesSurveys}
  aes={{ x: "long", y: "lat", color: "year" }}
  theme="dark"
  coord={{ type: "fixed" }}
  scales={{ color: { type: "continuous", scheme: "viridis", labels: "d" } }}
  labs={{
    title: "Eleven maps of the Great Lakes, 1688–1818",
    subtitle:
      "White crosses are the 39 true positions; each dot is one map's attempt at one of them",
    x: "Longitude (°)",
    y: "Latitude (°)",
    color: "Map year",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={2.6} alpha={0.75} />
  <GeomPoint
    data={greatLakesTruth}
    aes={{ x: "long", y: "lat", color: { value: "#ffffff" } }}
    size={3.4}
    shape="cross"
  />
</GGPlot>
