<script lang="ts">
  /**
   * Selection / inspection overlay strata for GGPlot (decision 0006 paint order).
   * Host owns anchors, inspection state, brush draft, and tools.
   *
   * Surface-interactive and inert selection overlays are mutually exclusive
   * via `{:else if}` so both never mount even if host props are inconsistent.
   */
  import type { CellValue } from "@ggsvelte/core";

  import type {
    InteractionTool,
    IntervalSelection,
    PlotInspectionChange,
  } from "../interaction/interaction.js";
  import InteractionOverlay from "./InteractionOverlay.svelte";
  import { shouldShowInertSelectionOverlay } from "../interaction/capability.js";

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

  let {
    width,
    height,
    interactive,
    surfaceInteractive,
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
    /** Chart-local interactive (tools or legend focus). */
    interactive: boolean;
    /** Capture + full overlay (available tools). */
    surfaceInteractive: boolean;
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

  const showInert = $derived(
    shouldShowInertSelectionOverlay({
      interactive,
      selectedAnchorCount: selectedAnchors.length,
      emphasizedAnchorCount: emphasizedAnchors.length,
    }),
  );
</script>

{#if surfaceInteractive}
  <InteractionOverlay
    {width}
    {height}
    {inspection}
    {inspectionPanel}
    {coordFlipped}
    {selectedAnchors}
    {emphasizedAnchors}
    {brushRect}
    {activeTool}
    {areaAwaitingSecond}
    {committedInterval}
  />
{:else if showInert}
  <InteractionOverlay
    {width}
    {height}
    interactive={false}
    {selectedAnchors}
    {emphasizedAnchors}
  />
{/if}
