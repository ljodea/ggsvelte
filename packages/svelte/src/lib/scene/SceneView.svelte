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
  import type {
    BatchInteractionMask,
    GeometryBatch,
    Scene,
  } from "@ggsvelte/core";
  import { sceneLabel, STRIP_BAND, themeVar } from "@ggsvelte/core";

  import Axis from "./Axis.svelte";
  import Batch from "./Batch.svelte";
  import Legend from "./Legend.svelte";
  import { resolveBatchFocusMasks } from "./stratum-paint.js";

  type Mode = "full" | "chrome-bottom" | "marks" | "chrome-top";

  const {
    scene,
    mode = "full",
    ariaLabel,
    batches = null,
    focusable = false,
    markLabel,
    focusMasks = [],
  }: {
    scene: Scene;
    mode?: Mode;
    /** Plot-level accessible name; falls back to the label derived from scene labs. */
    ariaLabel?: string | undefined;
    /** Batch subset for mode "marks" (defaults to every scene batch). */
    batches?: GeometryBatch[] | null;
    /** Give SVG point marks keyboard focus (tooltip targets; a11y pass). */
    focusable?: boolean;
    /** Accessible name for one mark's source row (focusable marks). */
    markLabel?: ((row: number) => string) | undefined;
    focusMasks?: readonly (BatchInteractionMask | null)[];
  } = $props();

  const uid = $props.id();

  const label = $derived(ariaLabel ?? sceneLabel(scene));
  const ink = $derived(themeVar("ink", scene.theme));
  const drawChrome = $derived(mode === "full" || mode === "chrome-bottom");
  const drawTop = $derived(mode === "full" || mode === "chrome-top");
  const drawMarks = $derived(mode === "full" || mode === "marks");
  const markBatches = $derived(batches ?? scene.batches);
  // Project once per (scene, markBatches, focusMasks) — O(S + B) via Map, not
  // indexOf per batch during panel loops.
  const markFocusMasks = $derived(
    resolveBatchFocusMasks(scene.batches, markBatches, focusMasks),
  );

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
  font-family={scene.theme.fontFamily}
  font-size={scene.theme.fontSize}
  font-weight={scene.theme.fontWeight}
  text-rendering="optimizeLegibility"
  shape-rendering="geometricPrecision"
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
      y={scene.theme.titleSize}
      font-size={scene.theme.titleSize}
      font-weight={scene.theme.titleWeight}
      fill={ink}>{scene.title}</text
    >
  {/if}
  {#if drawTop && scene.subtitle !== ""}
    <text
      class="gg-subtitle"
      x={gridBounds.left}
      y={scene.title === ""
        ? scene.theme.subtitleSize
        : scene.theme.titleSize + scene.theme.subtitleSize + 3}
      font-size={scene.theme.subtitleSize}
      font-weight={scene.theme.subtitleWeight}
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
        {#if scene.theme.panel !== "none"}
          <rect
            class="gg-panel-background"
            width={panel.width}
            height={panel.height}
            fill={themeVar("panel", scene.theme)}
          />
        {/if}
        <g
          class="gg-grid"
          stroke={themeVar("grid", scene.theme)}
          stroke-width={scene.theme.gridWidth}
          stroke-dasharray={scene.theme.gridDasharray || undefined}
          vector-effect="non-scaling-stroke"
        >
          {#if scene.theme.gridX}
            {#each panel.grid.x as gx, gi (gi)}
              <line x1={gx} y1="0" x2={gx} y2={panel.height} />
            {/each}
          {/if}
          {#if scene.theme.gridY}
            {#each panel.grid.y as gy, gi (gi)}
              <line x1="0" y1={gy} x2={panel.width} y2={gy} />
            {/each}
          {/if}
        </g>
      {/if}
      {#if drawMarks}
        <g class="gg-marks" clip-path={`url(#${uid}-clip-${i})`}>
          {#each markBatches as batch, bi (bi)}
            {#if batch.panelIndex === i}
              <Batch
                {batch}
                theme={scene.theme}
                {focusable}
                {markLabel}
                focusMask={markFocusMasks[bi] ?? null}
              />
            {/if}
          {/each}
        </g>
      {/if}
      {#if drawChrome && scene.theme.showPanelBorder}
        <rect
          class="gg-panel-border"
          width={panel.width}
          height={panel.height}
          fill="none"
          stroke={themeVar("panelBorder", scene.theme)}
          stroke-width={scene.theme.panelBorderWidth}
          vector-effect="non-scaling-stroke"
        />
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
          fill={ink}
          font-size={scene.theme.stripSize}
          font-weight={scene.theme.stripWeight}>{panel.strip}</text
        >
      </g>
    {/if}
    {#if drawChrome && panel.axisX !== null}
      <Axis ticks={panel.axisX} orient="x" {panel} theme={scene.theme} />
    {/if}
    {#if drawChrome && panel.axisY !== null}
      <Axis ticks={panel.axisY} orient="y" {panel} theme={scene.theme} />
    {/if}
  {/each}
  {#if drawChrome && scene.axes.x.title !== ""}
    <text
      class="gg-axis-title"
      x={(gridBounds.left + gridBounds.right) / 2}
      y={gridBounds.bottom + 32}
      text-anchor="middle"
      fill={ink}
      font-size={scene.theme.axisTitleSize}
      font-weight={scene.theme.axisTitleWeight}>{scene.axes.x.title}</text
    >
  {/if}
  {#if drawChrome && scene.axes.y.title !== ""}
    <text
      class="gg-axis-title"
      transform={`translate(12,${(gridBounds.top + gridBounds.bottom) / 2}) rotate(-90)`}
      text-anchor="middle"
      fill={ink}
      font-size={scene.theme.axisTitleSize}
      font-weight={scene.theme.axisTitleWeight}>{scene.axes.y.title}</text
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
        font-size={scene.theme.captionSize}
        text-anchor="end"
        fill={ink}>{scene.caption}</text
      >
    {/if}
  {/if}
</svg>

<style>
  @font-face {
    font-family: "Roboto Condensed";
    src: url("../fonts/RobotoCondensed-Light.ttf") format("truetype");
    font-style: normal;
    font-weight: 300;
    font-display: swap;
  }

  @font-face {
    font-family: "Roboto Condensed";
    src: url("../fonts/RobotoCondensed-Regular.ttf") format("truetype");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }

  @font-face {
    font-family: "Roboto Condensed";
    src: url("../fonts/RobotoCondensed-Bold.ttf") format("truetype");
    font-style: normal;
    font-weight: 700;
    font-display: swap;
  }

  @media (forced-colors: active) {
    .gg-plot {
      forced-color-adjust: none;
    }

    .gg-plot :global(text) {
      fill: CanvasText;
    }

    .gg-plot :global(.gg-paper),
    .gg-plot :global(.gg-panel-background) {
      fill: Canvas;
    }

    .gg-plot :global(.gg-grid) {
      stroke: GrayText;
    }

    .gg-plot :global(.gg-axis-line),
    .gg-plot :global(.gg-tick line),
    .gg-plot :global(.gg-panel-border) {
      stroke: CanvasText;
    }
  }
</style>
