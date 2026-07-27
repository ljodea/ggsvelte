<script lang="ts">
  import { GeomSf, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { triangles } from "./data.js";
</script>

<GGPlot data={triangles} aes={{ fill: "rate" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="geom_sf polygons"
    subtitle="Portable GeoJSON Geometry strings (already projected; #809)"
    fill="rate"
  />
  <GeomSf alpha={0.9} linewidth={0.8} />
</GGPlot>
