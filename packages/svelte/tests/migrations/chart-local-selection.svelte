<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    type PlotSelection,
  } from "../../src/lib/index.js";

  const rows = [
    { id: "a", flipper: 181, mass: 3750, species: "Adelie" },
    { id: "b", flipper: 195, mass: 3800, species: "Chinstrap" },
    { id: "c", flipper: 217, mass: 4500, species: "Gentoo" },
  ];
  let selection = $state<PlotSelection<string> | null>(null);
</script>

<GGPlot
  data={rows}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  key="id"
  select={{ type: "point", multiple: true }}
  onselect={(event) => (selection = event)}
>
  <GeomPoint />
</GGPlot>

<p>{selection === null ? 0 : selection.keys.length} selected</p>
