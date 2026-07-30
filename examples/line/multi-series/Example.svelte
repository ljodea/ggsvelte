<script lang="ts">
  import {
    createPlotInteraction,
    GeomLine,
    GeomPoint,
    GGPlot,
    GuideLegend,
    Labs,
    ScaleColorManual,
    ScaleXContinuous,
    ThemeEconomist,
  } from "@ggsvelte/svelte";

  import { wheatAndWages } from "./data.js";

  const interaction = createPlotInteraction({
    identity: (row) => `${row.year}:${row.series}`,
  });
  const scope = { keys: "wheat-rows" } as const;
</script>

<GGPlot
  data={wheatAndWages}
  aes={{ x: "year", y: "value", color: "series" }}
  {interaction}
  interactionScope={scope}
  width={640}
  height={400}
>
  <ThemeEconomist />
  <ScaleXContinuous
    breaks={[1600, 1650, 1700, 1750, 1800]}
    labels="d"
    nice={false}
  />
  <ScaleColorManual
    domain={["Wheat price", "Weekly wage"]}
    values={["#ed111a", "#014d64"]}
  />
  <Labs
    title="Playfair's wheat and wages, 1565–1821"
    subtitle="Shillings — the price swings, the wage only climbs"
    x="Year"
    y="Shillings"
    color="Series"
  />
  <GuideLegend channel="color" focus />
  <GeomLine linewidth={2} />
  <GeomPoint size={1.6} />
</GGPlot>
