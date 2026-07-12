<script lang="ts">
  /**
   * Renders a computed Scene as real SVG markup. Mirrors the structure of
   * @ggsvelte/core's renderToSVGString (same element tree, same class names)
   * — keep the two in sync. All theme colors ride --gg-* custom properties
   * with the resolved role tokens as fallbacks.
   *
   * `mode` supports the compositing strata (decision 0006): "full" renders
   * the whole plot in one SVG (the all-SVG common case); "chrome-bottom"
   * (paper/grid/axes/strips), "marks" (a batch subset, panel-clipped), and
   * "chrome-top" (titles/legends/caption) render the sandwich slices around
   * canvas strata. Clip-path ids are namespaced by Svelte's $props.id() so
   * several plots on a page never collide (unlike the deterministic-by-design
   * ids in renderToSVGString output).
   */
  import type { GeometryBatch, Scene } from "@ggsvelte/core";
  import { sceneLabel, STRIP_BAND, themeVar } from "@ggsvelte/core";

  import Axis from "./Axis.svelte";
  import Batch from "./Batch.svelte";
  import Legend from "./Legend.svelte";

  type Mode = "full" | "chrome-bottom" | "marks" | "chrome-top";

  const {
    scene,
    mode = "full",
    batches = null,
    focusable = false,
    markLabel,
  }: {
    scene: Scene;
    mode?: Mode;
    /** Batch subset for mode "marks" (defaults to every scene batch). */
    batches?: GeometryBatch[] | null;
    /** Give SVG point marks keyboard focus (tooltip targets; a11y pass). */
    focusable?: boolean;
    /** Accessible name for one mark's source row (focusable marks). */
    markLabel?: ((row: number) => string) | undefined;
  } = $props();

  const uid = $props.id();

  const label = $derived(sceneLabel(scene));
  const ink = $derived(themeVar("ink", scene.theme));
  const drawChrome = $derived(mode === "full" || mode === "chrome-bottom");
  const drawTop = $derived(mode === "full" || mode === "chrome-top");
  const drawMarks = $derived(mode === "full" || mode === "marks");
  const markBatches = $derived(batches ?? scene.batches);

  const gridBounds = $derived.by(() => {
    const panels = scene.panels;
    if (panels.length === 0) return { left: 0, right: 0, top: 0, bottom: 0 };
    return {
      left: Math.min(...panels.map((p) => p.x)),
      right: Math.max(...panels.map((p) => p.x + p.width)),
      top: Math.min(...panels.map((p) => p.y)),
      bottom: Math.max(...panels.map((p) => p.y + p.height)),
    };
  });
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={scene.width}
  height={scene.height}
  viewBox={`0 0 ${scene.width} ${scene.height}`}
  role={mode === "full" || mode === "chrome-bottom" ? "img" : "presentation"}
  aria-label={mode === "full" || mode === "chrome-bottom" ? label : undefined}
  aria-hidden={mode === "marks" || mode === "chrome-top" ? "true" : undefined}
  class={mode === "full" ? "gg-plot" : `gg-plot gg-stratum gg-svg-${mode}`}
  font-family="Helvetica, Arial, sans-serif"
  font-size="11"
>
  {#if mode === "full" || mode === "chrome-bottom"}
    <title>{label}</title>
  {/if}
  {#if drawChrome && scene.theme.paper !== "none"}
    <rect
      class="gg-paper"
      width={scene.width}
      height={scene.height}
      fill={themeVar("paper", scene.theme)}
    />
  {/if}
  {#if drawTop && scene.title !== ""}
    <text
      class="gg-title"
      x={gridBounds.left}
      y="16"
      font-size="15"
      font-weight="bold"
      fill={ink}>{scene.title}</text
    >
  {/if}
  {#if drawTop && scene.subtitle !== ""}
    <text
      class="gg-subtitle"
      x={gridBounds.left}
      y={scene.title === "" ? 13 : 34}
      font-size="12"
      fill={ink}>{scene.subtitle}</text
    >
  {/if}
  {#if drawMarks}
    <defs>
      {#each scene.panels as panel, i (i)}
        <clipPath id={`${uid}-clip-${i}`}>
          <rect width={panel.width} height={panel.height} />
        </clipPath>
      {/each}
    </defs>
  {/if}
  {#each scene.panels as panel, i (i)}
    <g
      class="gg-panel"
      data-panel={i}
      transform={`translate(${panel.x},${panel.y})`}
    >
      {#if drawChrome}
        <g class="gg-grid" stroke={themeVar("grid", scene.theme)}>
          {#each panel.grid.x as gx, gi (gi)}
            <line x1={gx} y1="0" x2={gx} y2={panel.height} />
          {/each}
          {#each panel.grid.y as gy, gi (gi)}
            <line x1="0" y1={gy} x2={panel.width} y2={gy} />
          {/each}
        </g>
      {/if}
      {#if drawMarks}
        <g class="gg-marks" clip-path={`url(#${uid}-clip-${i})`}>
          {#each markBatches as batch, bi (bi)}
            {#if batch.panelIndex === i}
              <Batch {batch} theme={scene.theme} {focusable} {markLabel} />
            {/if}
          {/each}
        </g>
      {/if}
    </g>
    {#if drawChrome && panel.strip !== ""}
      <g
        class="gg-strip"
        transform={`translate(${panel.x},${panel.y - STRIP_BAND})`}
      >
        <rect
          width={panel.width}
          height={STRIP_BAND - 2}
          fill={themeVar("grid", scene.theme)}
        />
        <text
          x={panel.width / 2}
          y={(STRIP_BAND - 2) / 2}
          dy="0.32em"
          text-anchor="middle"
          fill={ink}>{panel.strip}</text
        >
      </g>
    {/if}
    {#if drawChrome && panel.axisX !== null}
      <Axis ticks={panel.axisX} orient="x" {panel} {ink} />
    {/if}
    {#if drawChrome && panel.axisY !== null}
      <Axis ticks={panel.axisY} orient="y" {panel} {ink} />
    {/if}
  {/each}
  {#if drawChrome && scene.axes.x.title !== ""}
    <text
      class="gg-axis-title"
      x={(gridBounds.left + gridBounds.right) / 2}
      y={gridBounds.bottom + 34}
      text-anchor="middle"
      fill={ink}>{scene.axes.x.title}</text
    >
  {/if}
  {#if drawChrome && scene.axes.y.title !== ""}
    <text
      class="gg-axis-title"
      transform={`translate(12,${(gridBounds.top + gridBounds.bottom) / 2}) rotate(-90)`}
      text-anchor="middle"
      fill={ink}>{scene.axes.y.title}</text
    >
  {/if}
  {#if drawTop}
    {#each scene.legends as legend (legend.scale)}
      <Legend {legend} theme={scene.theme} />
    {/each}
    {#if scene.caption !== ""}
      <text
        class="gg-caption"
        x={scene.width - 4}
        y={scene.height - 4}
        font-size="9"
        text-anchor="end"
        fill={ink}>{scene.caption}</text
      >
    {/if}
  {/if}
</svg>
