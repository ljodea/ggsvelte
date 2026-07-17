<script lang="ts">
  import type { CellValue } from "@ggsvelte/core";

  import type {
    InteractionTool,
    IntervalSelection,
    PlotInspectionChange,
  } from "../interaction.js";
  import { normalizedRect } from "./geometry.js";

  type Anchor = { readonly x: number; readonly y: number };
  type Panel = {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  type BrushRect = {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
  };

  const {
    width,
    height,
    interactive = true,
    inspection = null,
    inspectionPanel = null,
    coordFlipped = false,
    selectedAnchors = [],
    emphasizedAnchors = [],
    brushRect = null,
    activeTool = "inspect",
    areaAwaitingSecond = false,
    committedInterval = null,
  }: {
    width: number;
    height: number;
    interactive?: boolean;
    inspection?: PlotInspectionChange<
      Record<string, CellValue>,
      PropertyKey
    > | null;
    inspectionPanel?: Panel | null;
    coordFlipped?: boolean;
    selectedAnchors?: readonly Anchor[];
    emphasizedAnchors?: readonly Anchor[];
    brushRect?: BrushRect | null;
    activeTool?: InteractionTool;
    areaAwaitingSecond?: boolean;
    committedInterval?: IntervalSelection | null;
  } = $props();
</script>

<svg
  class="gg-stratum gg-interaction-overlay"
  {width}
  {height}
  viewBox={`0 0 ${width} ${height}`}
  aria-hidden="true"
>
  {#if interactive && inspection !== null}
    {#if inspection.mode === "xy" || (inspection.mode === "x" && !coordFlipped) || (inspection.mode === "y" && coordFlipped)}
      {#if inspectionPanel}
        <line
          class="gg-crosshair"
          x1={inspection.focus.anchor.x}
          x2={inspection.focus.anchor.x}
          y1={inspectionPanel.y}
          y2={inspectionPanel.y + inspectionPanel.height}
        />
        {#if "axisLabel" in inspection}
          <text
            class={`gg-crosshair-axis-label gg-crosshair-axis-label-${inspection.mode}`}
            x={inspection.focus.anchor.x}
            y={inspectionPanel.y + inspectionPanel.height - 4}
            text-anchor="middle">{inspection.axisLabel}</text
          >
        {/if}
      {/if}
    {/if}
    {#if inspection.mode === "xy" || (inspection.mode === "y" && !coordFlipped) || (inspection.mode === "x" && coordFlipped)}
      {#if inspectionPanel}
        <line
          class="gg-crosshair"
          x1={inspectionPanel.x}
          x2={inspectionPanel.x + inspectionPanel.width}
          y1={inspection.focus.anchor.y}
          y2={inspection.focus.anchor.y}
        />
        {#if "axisLabel" in inspection}
          <text
            class={`gg-crosshair-axis-label gg-crosshair-axis-label-${inspection.mode}`}
            x={inspectionPanel.x + 4}
            y={inspection.focus.anchor.y - 4}>{inspection.axisLabel}</text
          >
        {/if}
      {/if}
    {/if}
    <circle
      class="gg-hover-ring"
      cx={inspection.focus.anchor.x}
      cy={inspection.focus.anchor.y}
      r="6"
      fill="none"
    />
  {/if}
  <!-- Selection rings are presentation of shared controller state; passive
       consumers (interactive=false) must still show them. -->
  {#each selectedAnchors as anchor, index (index)}
    <circle
      class="gg-selected-ring"
      cx={anchor.x}
      cy={anchor.y}
      r="8"
      fill="none"
    />
  {/each}
  {#each emphasizedAnchors as anchor, index (index)}
    <circle
      class="gg-emphasized-ring"
      cx={anchor.x}
      cy={anchor.y}
      r="11"
      fill="none"
    />
  {/each}
  {#if interactive && brushRect !== null}
    {@const r = normalizedRect(brushRect)}
    <rect
      class="gg-area-draft"
      class:gg-area-draft-select={activeTool === "select-area"}
      class:gg-area-draft-zoom={activeTool === "zoom-area"}
      x={r.x0}
      y={r.y0}
      width={r.x1 - r.x0}
      height={r.y1 - r.y0}
      fill={activeTool === "zoom-area"
        ? "none"
        : "var(--gg-selectionFill, var(--gg-theme-selectionFill, currentColor))"}
      fill-opacity={activeTool === "zoom-area" ? undefined : "0.12"}
      stroke="var(--gg-selectionStroke, var(--gg-theme-selectionStroke, currentColor))"
    />
    {#if activeTool === "zoom-area"}
      <text class="gg-zoom-label" x={r.x0 + 5} y={r.y0 + 15}>Zoom</text>
    {/if}
    {#if areaAwaitingSecond}
      <circle
        class="gg-first-corner"
        cx={brushRect.x0}
        cy={brushRect.y0}
        r="4"
        fill="var(--gg-selectionStroke, var(--gg-theme-selectionStroke, currentColor))"
      />
    {/if}
  {/if}
  {#if interactive && committedInterval !== null}
    <rect
      class="gg-selection"
      x={committedInterval.pixels.x0}
      y={committedInterval.pixels.y0}
      width={committedInterval.pixels.x1 - committedInterval.pixels.x0}
      height={committedInterval.pixels.y1 - committedInterval.pixels.y0}
      fill="var(--gg-selectionFill, var(--gg-theme-selectionFill, currentColor))"
      fill-opacity="0.08"
      stroke="var(--gg-selectionStroke, var(--gg-theme-selectionStroke, currentColor))"
    />
  {/if}
</svg>

<style>
  .gg-crosshair {
    stroke: var(--gg-crosshair, var(--gg-theme-crosshair, currentColor));
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    opacity: 0.55;
  }

  .gg-crosshair-axis-label {
    fill: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    font: 11px/1 var(--gg-font-family, sans-serif);
    paint-order: stroke;
    stroke: var(--gg-tooltipPaper, var(--gg-theme-tooltipPaper, white));
    stroke-width: 3px;
    stroke-linejoin: round;
  }

  .gg-hover-ring {
    stroke: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .gg-selected-ring {
    stroke: var(
      --gg-selectionStroke,
      var(--gg-theme-selectionStroke, currentColor)
    );
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
  }

  .gg-emphasized-ring {
    stroke: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    stroke-width: 2;
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
  }

  .gg-area-draft,
  .gg-selection {
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .gg-zoom-label {
    fill: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    font: 10px/1 var(--gg-font-family, sans-serif);
    paint-order: stroke;
    stroke: var(--gg-tooltipPaper, var(--gg-theme-tooltipPaper, white));
    stroke-width: 3px;
  }

  @media (forced-colors: active) {
    .gg-emphasized-ring {
      stroke: Highlight;
    }

    .gg-area-draft-select,
    .gg-selection {
      fill: none;
      stroke: Highlight;
    }

    .gg-area-draft-zoom {
      fill: none;
      stroke: CanvasText;
      stroke-width: 2;
    }

    .gg-crosshair,
    .gg-hover-ring,
    .gg-selected-ring {
      stroke: Highlight;
    }

    .gg-zoom-label {
      fill: CanvasText;
      stroke: Canvas;
    }
  }
</style>
