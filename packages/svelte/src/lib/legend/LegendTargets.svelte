<script lang="ts">
  /**
   * Interactive legend hit targets + clear control for GGPlot.
   * Host owns focus state machine, key index, and commit/preview side effects.
   */
  import type { InteractiveLegendEntry, LegendEntryIdentity } from "./focus.js";

  const {
    entries,
    previewIdentity = null,
    pressedIdentity = null,
    rovingIndex = 0,
    sceneWidth,
    sceneHeight,
    /** Anchor x for clear control; null hides the clear button. */
    clearLegendX = null,
    onPreviewIndex,
    onPreviewClear,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onFocus,
    onBlur,
    onClick,
    onKeyDown,
    onClearPointerDown,
    onClearPointerCancel,
    onClearClick,
  }: {
    entries: readonly InteractiveLegendEntry[];
    previewIdentity?: LegendEntryIdentity | null;
    pressedIdentity?: LegendEntryIdentity | null;
    rovingIndex?: number;
    sceneWidth: number;
    sceneHeight: number;
    clearLegendX?: number | null;
    onPreviewIndex: (index: number, source: "pointer") => void;
    onPreviewClear: () => void;
    onPointerDown: (event: PointerEvent, index: number) => void;
    onPointerUp: (event: PointerEvent, index: number) => void;
    onPointerCancel: () => void;
    onFocus: (index: number) => void;
    onBlur: (event: FocusEvent) => void;
    onClick: (event: MouseEvent, index: number) => void;
    onKeyDown: (event: KeyboardEvent, index: number) => void;
    onClearPointerDown: (pointerType: string) => void;
    onClearPointerCancel: () => void;
    onClearClick: (event: MouseEvent) => void;
  } = $props();

  function sameIdentity(
    left: LegendEntryIdentity | null | undefined,
    right: LegendEntryIdentity,
  ): boolean {
    return (
      left !== null &&
      left !== undefined &&
      left.scale === right.scale &&
      left.entryIndex === right.entryIndex
    );
  }

  function targetAriaLabel(target: InteractiveLegendEntry): string {
    const scale = target.identity.scale;
    const aesthetics = target.legend.aesthetics ?? [scale];
    return `${target.legend.title || scale}: ${target.entry.fullLabel ?? target.entry.label} (${aesthetics.join(" + ")} legend)`;
  }

  function targetLeft(target: InteractiveLegendEntry): number {
    return (
      target.legend.x +
      (target.legend.direction === "horizontal" ? (target.entry.x ?? 0) : 0)
    );
  }

  function targetWidth(target: InteractiveLegendEntry, index: number): number {
    if (target.legend.direction !== "horizontal")
      return Math.max(24, target.legend.width);
    const start = target.entry.x ?? 0;
    const next = entries[index + 1];
    const end =
      next?.legend === target.legend
        ? (next.entry.x ?? target.legend.width)
        : target.legend.width;
    return Math.max(24, end - start);
  }
</script>

{#if entries.length > 0}
  <div class="gg-legend-targets" role="group" aria-label="Interactive legends">
    {#each entries as target, index (`${target.identity.scale}:${target.identity.entryIndex}`)}
      <button
        type="button"
        class="gg-legend-target"
        class:gg-legend-target-active={sameIdentity(
          previewIdentity,
          target.identity,
        )}
        aria-label={targetAriaLabel(target)}
        aria-pressed={sameIdentity(pressedIdentity, target.identity)}
        tabindex={index === rovingIndex ? 0 : -1}
        data-gg-legend-target
        data-index={index}
        style:left={`${targetLeft(target)}px`}
        style:top={`${target.legend.y + target.entry.y}px`}
        style:width={`${targetWidth(target, index)}px`}
        onpointerenter={(event) => {
          if (event.pointerType !== "touch") onPreviewIndex(index, "pointer");
        }}
        onpointerleave={() => onPreviewClear()}
        onpointerdown={(event) => onPointerDown(event, index)}
        onpointerup={(event) => onPointerUp(event, index)}
        onpointercancel={() => onPointerCancel()}
        onfocus={() => onFocus(index)}
        onblur={onBlur}
        onclick={(event) => onClick(event, index)}
        onkeydown={(event) => onKeyDown(event, index)}
      >
        <span class="gg-legend-target-label">{target.entry.label}</span>
      </button>
    {/each}
  </div>
{/if}
{#if clearLegendX !== null}
  <button
    type="button"
    class="gg-legend-clear"
    aria-label="Clear legend focus"
    style:left={`${Math.max(4, Math.min(clearLegendX, sceneWidth - 52))}px`}
    style:top={`${sceneHeight + 4}px`}
    onpointerdown={(event) => onClearPointerDown(event.pointerType)}
    onpointercancel={() => onClearPointerCancel()}
    onclick={(event) => onClearClick(event)}>Clear</button
  >
{/if}

<style>
  .gg-legend-clear {
    position: absolute;
    z-index: 5;
    min-width: 44px;
    min-height: 44px;
    border: 1px solid
      var(--gg-tooltipBorder, var(--gg-theme-tooltipBorder, currentColor));
    border-radius: 3px;
    padding: 2px 6px;
    background: var(
      --gg-tooltipPaper,
      var(
        --gg-tooltip-background,
        var(--gg-theme-tooltipPaper, var(--gg-paper, #fff))
      )
    );
    color: var(
      --gg-tooltipInk,
      var(
        --gg-tooltip-foreground,
        var(--gg-theme-tooltipInk, var(--gg-ink, #1f2328))
      )
    );
    font: 11px/1.2 var(--gg-font-family, sans-serif);
    white-space: nowrap;
    pointer-events: auto;
  }

  .gg-legend-targets {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
  }

  .gg-legend-target {
    position: absolute;
    min-width: 24px;
    min-height: 24px;
    margin: 0;
    border: 1px solid transparent;
    border-radius: 3px;
    padding: 0;
    background: transparent;
    color: transparent;
    pointer-events: auto;
    touch-action: manipulation;
  }

  .gg-legend-target:hover,
  .gg-legend-target-active,
  .gg-legend-target[aria-pressed="true"] {
    border-color: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    background: color-mix(in srgb, currentColor 7%, transparent);
  }

  .gg-legend-target:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: -2px;
  }

  .gg-legend-clear:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  @media (forced-colors: active) {
    .gg-legend-target:hover,
    .gg-legend-target-active,
    .gg-legend-target[aria-pressed="true"] {
      border-color: Highlight;
      background: Canvas;
    }

    .gg-legend-clear {
      border-color: ButtonText;
      background: Canvas;
      color: CanvasText;
    }
  }

  /* Local sr-only for target labels (GGPlot keeps its own .gg-sr-only for other chrome). */
  .gg-legend-target-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
