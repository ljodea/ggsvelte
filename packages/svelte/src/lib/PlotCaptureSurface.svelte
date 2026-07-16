<script lang="ts">
  /**
   * Pointer capture layer for GGPlot interaction (decision 0006).
   * Host owns handlers, inspection/tool state, and focus restoration.
   * Capture is a single absolutely positioned root under `.gg-plot-root`.
   */
  import { isAreaTool, type InteractionTool } from "./interaction.js";

  let {
    element = $bindable(null as HTMLDivElement | null),
    plotId,
    activeTool,
    ariaLabel,
    ariaControls,
    onFocus,
    onBlur,
    onPointerMove,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onClick,
    onKeyDown,
    onDblClick,
  }: {
    element?: HTMLDivElement | null;
    plotId: string;
    activeTool: InteractionTool;
    ariaLabel: string;
    ariaControls?: string | undefined;
    onFocus: () => void;
    onBlur: (event: FocusEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerLeave: () => void;
    onPointerDown: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: () => void;
    onLostPointerCapture: () => void;
    onClick: (event: MouseEvent) => void;
    onKeyDown: (event: KeyboardEvent) => void;
    onDblClick: () => void;
  } = $props();
</script>

<!-- The capture layer is a pointer-only surface; the accessible
     interaction paths are focusable marks and the data table. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={element}
  class="gg-capture"
  class:gg-area-tool={isAreaTool(activeTool)}
  role="group"
  tabindex="0"
  aria-label={ariaLabel}
  aria-describedby={`${plotId}-description ${plotId}-active`}
  aria-controls={ariaControls}
  onfocus={onFocus}
  onblur={onBlur}
  onpointermove={onPointerMove}
  onpointerleave={onPointerLeave}
  onpointerdown={onPointerDown}
  onpointerup={onPointerUp}
  onpointercancel={onPointerCancel}
  onlostpointercapture={onLostPointerCapture}
  onclick={onClick}
  onkeydown={onKeyDown}
  ondblclick={onDblClick}
></div>

<style>
  .gg-capture {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    touch-action: pan-y pinch-zoom;
    background: transparent;
  }

  .gg-capture.gg-area-tool {
    touch-action: none;
    cursor: crosshair;
  }

  .gg-capture:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  /* Capture has no transitions; mirror PlotStatusChrome reduced-motion
     policy for consumer-supplied overrides on this node. */
  @media (prefers-reduced-motion: reduce) {
    .gg-capture {
      scroll-behavior: auto;
      transition: none !important;
      animation: none !important;
    }
  }

  @media (forced-colors: active) {
    .gg-capture:focus-visible {
      outline-color: Highlight;
    }
  }
</style>
