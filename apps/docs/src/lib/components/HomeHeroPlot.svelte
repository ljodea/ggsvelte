<script lang="ts">
  import type { PlotInspectionChange } from "@ggsvelte/svelte";
  import { GeomPoint, GGPlot, Labs, Scale, Theme } from "@ggsvelte/svelte";

  import { guerry } from "$examples/point/scatter-color/data";
  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";

  type GuerryRow = (typeof guerry)[number];

  const heroTheme = $derived(contrastChartTheme());
</script>

{#snippet heroTooltip(
  inspection: PlotInspectionChange<Record<string, unknown>, PropertyKey>,
)}
  {@const row = inspection.focus.row as GuerryRow | null}
  {#if row}
    <div class="hero-tooltip">
      <div class="hero-tooltip-title">{row.department}</div>
      <dl>
        <dt>literacy</dt>
        <dd>{row.literacy}%</dd>
        <dt>pop. per crime</dt>
        <dd>{row.crimePersons}</dd>
        <dt>region</dt>
        <dd>{row.region}</dd>
      </dl>
    </div>
  {/if}
{/snippet}

<!--
  Exact point inspection (not mode "x"): no vertical axis guide, one
  department at a time. Custom content names the department (identity
  column not on a mapped channel). Default tooltips use labs titles
  for mapped channels (#752).
-->
<GGPlot
  data={guerry}
  aes={{ x: "literacy", y: "crimePersons", color: "region" }}
  inspect={{
    mode: "exact",
    pin: true,
    maxDistance: 24,
    content: heroTooltip,
  }}
  width="container"
  height={400}
  ariaLabel="Literacy percentage against population per crime against persons for 85 French departments, coloured by region"
>
  <Theme name={heroTheme} />
  <Scale value={{ color: { type: "ordinal", scheme: "tableau10" } }} />
  <Labs
    title="Literacy and crime in France, 1833"
    subtitle="85 French departments — higher y means fewer crimes per head"
    x="Literate conscripts (%)"
    y="Population per crime against persons"
    color="Region"
  />
  <GeomPoint size={4} alpha={0.85} />
</GGPlot>

<style>
  .hero-tooltip-title {
    margin-bottom: 0.35rem;
    font-weight: 650;
  }

  .hero-tooltip dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto auto;
    gap: 0 0.75rem;
  }

  .hero-tooltip dt {
    font-weight: 600;
  }

  .hero-tooltip dd {
    margin: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
