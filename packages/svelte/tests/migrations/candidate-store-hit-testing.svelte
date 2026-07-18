<script lang="ts">
  import { GeomPoint, GGPlot, type RenderModel } from "../../src/lib/index.js";

  const rows = [
    { id: "a", x: 1, y: 3 },
    { id: "b", x: 2, y: 4 },
  ];
  let model = $state<RenderModel | null>(null);
  let hitRow = $state<number | null>(null);

  function inspectPlotPixel(x: number, y: number): void {
    hitRow = model?.candidates.hitTest(x, y)?.rowIndex ?? null;
  }
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  key="id"
  inspect
  onrender={(next) => (model = next)}
>
  <GeomPoint />
</GGPlot>

<button type="button" onclick={() => inspectPlotPixel(100, 100)}>
  Resolve plot pixel
</button>
<p>{hitRow === null ? "No hit" : `Row ${hitRow}`}</p>
