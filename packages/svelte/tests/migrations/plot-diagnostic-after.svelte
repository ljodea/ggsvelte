<script lang="ts">
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";
  import type { PlotDiagnostic } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  function ondiagnostic(diagnostic: PlotDiagnostic): void {
    console.warn(diagnostic.code, diagnostic.message);
  }
</script>

<!-- After 0.11: ondiagnostic receives PlotDiagnostic (interaction ∪ deprecation). -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} {ondiagnostic}>
  <GeomPoint />
</GGPlot>
