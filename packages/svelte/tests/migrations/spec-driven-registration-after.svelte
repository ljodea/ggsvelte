<script lang="ts">
  import { GGPlot, registerAll } from "../../src/lib/index.js";

  // After 0.27: spec-driven charts (layers prop / spec, no <Geom*> components
  // to self-register) opt into the full grammar once at app startup. Component
  // children need no call — they self-register on import.
  registerAll();

  const rows = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
    { x: 4, y: 25 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "smooth" }]}
  width={480}
  height={320}
/>
