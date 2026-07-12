<script lang="ts">
  /** One panel's axis ticks (mirrors renderToSVGString's renderPanelAxes).
   *  Axis TITLES are plot-level and render in SceneView. */
  import type { SceneTick, ScenePanel } from "@ggsvelte/core";

  const {
    ticks,
    orient,
    panel,
    ink = "currentColor",
  }: {
    ticks: SceneTick[];
    orient: "x" | "y";
    panel: ScenePanel;
    /** Resolved ink color (a --gg-ink var expression from the scene theme). */
    ink?: string;
  } = $props();
</script>

{#if orient === "x"}
  <g
    class="gg-axis gg-axis-x"
    transform={`translate(${panel.x},${panel.y + panel.height})`}
  >
    <line
      class="gg-axis-line"
      x1="0"
      y1="0"
      x2={panel.width}
      y2="0"
      stroke={ink}
    />
    {#each ticks as tick, i (i)}
      <g class="gg-tick" transform={`translate(${tick.pos},0)`}>
        <line y2="6" stroke={ink} />
        {#if tick.label !== ""}
          <text y="9" dy="0.71em" text-anchor="middle" fill={ink}
            >{tick.label}</text
          >
        {/if}
      </g>
    {/each}
  </g>
{:else}
  <g class="gg-axis gg-axis-y" transform={`translate(${panel.x},${panel.y})`}>
    <line
      class="gg-axis-line"
      x1="0"
      y1="0"
      x2="0"
      y2={panel.height}
      stroke={ink}
    />
    {#each ticks as tick, i (i)}
      <g class="gg-tick" transform={`translate(0,${tick.pos})`}>
        <line x2="-6" stroke={ink} />
        {#if tick.label !== ""}
          <text x="-9" dy="0.32em" text-anchor="end" fill={ink}
            >{tick.label}</text
          >
        {/if}
      </g>
    {/each}
  </g>
{/if}
