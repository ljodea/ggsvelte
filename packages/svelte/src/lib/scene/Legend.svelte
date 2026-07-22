<script lang="ts">
  /**
   * One SceneLegend (discrete swatches or continuous ramp), already placed by
   * the layout in plot px. Mirrors renderToSVGString's legend structure (same
   * class names); the gradient id uses $props.id() so several plots on one
   * page never collide.
   *
   * Legend interaction pure helpers live under legend/ (focus.ts identity,
   * entry-key-index, focus-emphasis, focus-plans). This component only paints
   * static SVG chrome.
   */
  import type { SceneLegend, ThemeTokens } from "@ggsvelte/core";
  import { LEGEND_ROW_HEIGHT, LINETYPE_DASHES, themeVar } from "@ggsvelte/core";
  import { LINETYPE_NAMES } from "@ggsvelte/spec";

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
      {@const keyY = entry.y + (LEGEND_ROW_HEIGHT - legend.swatchSize) / 2}
      {@const keyX = 4 + legend.swatchSize / 2}
      {@const keyCenterY = keyY + legend.swatchSize / 2}
      {@const keyColor =
        (entry.shape !== undefined ||
          entry.size !== undefined ||
          entry.linetype !== undefined ||
          entry.linewidth !== undefined) &&
        entry.color === "#999999"
          ? ink
          : entry.color}
      <!-- Shape key geometry must match core's pointShape() so SSR/pure-SVG
           and hydrated Svelte legend keys render identical proportions. -->
      {#if entry.shape === "square"}
        <rect
          class="gg-legend-key gg-shape-square"
          x={keyX -
            Math.min(
              legend.swatchSize / 2,
              entry.size ?? legend.swatchSize / 2,
            )}
          y={keyCenterY -
            Math.min(
              legend.swatchSize / 2,
              entry.size ?? legend.swatchSize / 2,
            )}
          width={Math.min(
            legend.swatchSize,
            (entry.size ?? legend.swatchSize / 2) * 2,
          )}
          height={Math.min(
            legend.swatchSize,
            (entry.size ?? legend.swatchSize / 2) * 2,
          )}
          fill={keyColor}
          opacity={entry.alpha}
        />
      {:else if entry.shape === "triangle"}
        {@const r = Math.min(
          legend.swatchSize / 2,
          entry.size ?? legend.swatchSize / 2,
        )}
        <path
          class="gg-legend-key gg-shape-triangle"
          d={`M${keyX} ${keyCenterY - r * 1.2}L${keyX + r * 1.1} ${keyCenterY + r * 0.9}L${keyX - r * 1.1} ${keyCenterY + r * 0.9}Z`}
          fill={keyColor}
          opacity={entry.alpha}
        />
      {:else if entry.shape === "diamond"}
        {@const r = Math.min(
          legend.swatchSize / 2,
          entry.size ?? legend.swatchSize / 2,
        )}
        <path
          class="gg-legend-key gg-shape-diamond"
          d={`M${keyX} ${keyCenterY - r * 1.25}L${keyX + r} ${keyCenterY}L${keyX} ${keyCenterY + r * 1.25}L${keyX - r} ${keyCenterY}Z`}
          fill={keyColor}
          opacity={entry.alpha}
        />
      {:else if entry.shape === "plus" || entry.shape === "cross"}
        {@const r = Math.min(
          legend.swatchSize / 2,
          entry.size ?? legend.swatchSize / 2,
        )}
        <path
          class={`gg-legend-key gg-shape-${entry.shape}`}
          d={entry.shape === "plus"
            ? `M${keyX - r} ${keyCenterY}H${keyX + r}M${keyX} ${keyCenterY - r}V${keyCenterY + r}`
            : `M${keyX - r * 0.75} ${keyCenterY - r * 0.75}L${keyX + r * 0.75} ${keyCenterY + r * 0.75}M${keyX + r * 0.75} ${keyCenterY - r * 0.75}L${keyX - r * 0.75} ${keyCenterY + r * 0.75}`}
          fill="none"
          stroke={keyColor}
          stroke-width={Math.max(1, r / 2)}
          opacity={entry.alpha}
        />
      {:else if entry.shape !== undefined || entry.size !== undefined}
        <circle
          class="gg-legend-key gg-shape-circle"
          cx={keyX}
          cy={keyCenterY}
          r={Math.min(
            legend.swatchSize / 2,
            entry.size ?? legend.swatchSize / 2,
          )}
          fill={keyColor}
          opacity={entry.alpha}
        />
      {:else if entry.linetype !== undefined || entry.linewidth !== undefined}
        {@const linetype = entry.linetype ?? "solid"}
        {@const dash = LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? []}
        <line
          class="gg-legend-key"
          x1="4"
          y1={keyCenterY}
          x2={4 + legend.swatchSize}
          y2={keyCenterY}
          stroke={keyColor}
          stroke-width={entry.linewidth ?? 1.5}
          stroke-dasharray={dash.length === 0 ? undefined : dash.join(" ")}
          opacity={entry.alpha}
        />
      {:else}
        <rect
          class="gg-legend-swatch"
          x="4"
          y={keyY}
          width={legend.swatchSize}
          height={legend.swatchSize}
          fill={entry.color}
          opacity={entry.alpha}
        />
      {/if}
      <text
        class="gg-legend-label"
        x={4 + legend.swatchSize + 6}
        y={entry.y + LEGEND_ROW_HEIGHT / 2}
        dy="0.32em"
        fill={ink}>{entry.label}</text
      >
    {/each}
  {:else if legend.type === "steps"}
    {#each legend.entries as entry (entry.y)}
      <rect
        class="gg-legend-step"
        x="4"
        y={rampTop + entry.y}
        width={legend.stepWidth}
        height={legend.stepHeight}
        fill={entry.color}
      />
      <text
        class="gg-legend-label"
        x={4 + legend.stepWidth + 6}
        y={rampTop + entry.y + legend.stepHeight / 2}
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
    {#each legend.ticks as tick}
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
