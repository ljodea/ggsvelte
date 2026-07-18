<script lang="ts">
  import {
    createPlotInteraction,
    GeomPoint,
    GGPlot,
  } from "../../src/lib/index.js";

  const rows = [
    { id: "a", flipper: 181, mass: 3750, species: "Adelie" },
    { id: "b", flipper: 195, mass: 3800, species: "Chinstrap" },
    { id: "c", flipper: 217, mass: 4500, species: "Gentoo" },
  ];
  const scope = { keys: "row-id", x: "flipper-mm", y: "mass-g" } as const;
  const interaction = createPlotInteraction<string>();
  const selected = $derived(interaction.selected(scope));
</script>

<GGPlot
  data={rows}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
>
  <GeomPoint />
</GGPlot>

<p>{selected.length} selected</p>
