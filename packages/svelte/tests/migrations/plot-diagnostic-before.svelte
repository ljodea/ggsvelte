<script lang="ts">
  import { GeomPoint, GGPlot } from "../../src/lib/index.js";
  import type {
    InteractionDiagnostic,
    PlotDiagnostic,
  } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  function legacy(diagnostic: InteractionDiagnostic): void {
    console.warn(diagnostic.code, diagnostic.message);
  }

  // @ts-expect-error Pre-0.11 InteractionDiagnostic-only handlers are not assignable to PlotDiagnostic.
  const ondiagnostic: (diagnostic: PlotDiagnostic) => void = legacy;
</script>

<!-- Before 0.11: ondiagnostic was typed as InteractionDiagnostic only. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} {ondiagnostic}>
  <GeomPoint />
</GGPlot>
