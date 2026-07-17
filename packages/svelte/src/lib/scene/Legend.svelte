<script lang="ts">
  /**
   * One SceneLegend (discrete swatches or continuous ramp), already placed by
   * the layout in plot px. Mirrors renderToSVGString's legend structure (same
   * class names); the gradient id uses $props.id() so several plots on one
   * page never collide.
   *
   * Legend interaction types live in legend/focus.ts (pure helpers used
   * by GGPlot). This component only paints static SVG chrome.
   */
  import type { SceneLegend, ThemeTokens } from "@ggsvelte/core";
  import { LEGEND_ROW_HEIGHT, themeVar } from "@ggsvelte/core";

  const { legend, theme }: { legend: SceneLegend; theme: ThemeTokens } =
    $props();

  const uid = $props.id();
  const gradientId = $derived(`gg-ramp-${uid}-${legend.scale}`);
  const ink = $derived(themeVar("ink", theme));
  const rampTop = $derived(legend.title === "" ? 0 : 18);
</script>

<g
  class={`gg-legend gg-legend-${legend.scale}`}
  transform={`translate(${legend.x},${legend.y})`}
>
  {#if legend.title !== ""}
    <text class="gg-legend-title" x="4" y="11" font-weight="bold" fill={ink}
      >{legend.title}</text
    >
  {/if}
  {#if legend.type === "discrete"}
    {#each legend.entries as entry (entry.label)}
      <rect
        class="gg-legend-swatch"
        x="4"
        y={entry.y + (LEGEND_ROW_HEIGHT - legend.swatchSize) / 2}
        width={legend.swatchSize}
        height={legend.swatchSize}
        fill={entry.color}
      />
      <text
        class="gg-legend-label"
        x={4 + legend.swatchSize + 6}
        y={entry.y + LEGEND_ROW_HEIGHT / 2}
        dy="0.32em"
        fill={ink}>{entry.label}</text
      >
    {/each}
  {:else}
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        {#each legend.stops as [offset, color] (offset)}
          <stop offset={`${offset * 100}%`} stop-color={color} />
        {/each}
      </linearGradient>
    </defs>
    <rect
      class="gg-legend-ramp"
      x="4"
      y={rampTop}
      width={legend.rampWidth}
      height={legend.rampHeight}
      fill={`url(#${gradientId})`}
    />
    {#each legend.ticks as tick (tick.y)}
      <text
        class="gg-legend-label"
        x={4 + legend.rampWidth + 6}
        y={rampTop + tick.y}
        dy="0.32em"
        fill={ink}>{tick.label}</text
      >
    {/each}
  {/if}
</g>
