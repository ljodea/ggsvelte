<script lang="ts">
  import type { Snippet } from "svelte";

  import type { CellValue } from "@ggsvelte/core";

  import type { PlotInspectionChange } from "../interaction/interaction.js";
  import {
    collapseIdenticalDisplayMembers,
    formatTooltipCell,
  } from "./display-members.js";

  const {
    inspection,
    width,
    height,
    content,
    interactive = false,
    onclose,
    onenter,
    onleave,
    id,
    docked = false,
  }: {
    inspection: PlotInspectionChange<Record<string, CellValue>, PropertyKey>;
    width: number;
    height: number;
    content?:
      | Snippet<[PlotInspectionChange<Record<string, CellValue>, PropertyKey>]>
      | undefined;
    interactive?: boolean;
    onclose?: (source: "pointer" | "keyboard") => void;
    onenter?: () => void;
    onleave?: () => void;
    id?: string;
    docked?: boolean;
  } = $props();

  const anchor = $derived(inspection.focus.anchor);
  const OFFSET = 10;
  const EDGE = 8;
  let tooltipElement = $state<HTMLDivElement | null>(null);
  let measuredWidth = $state(0);
  let measuredHeight = $state(0);

  $effect(() => {
    if (docked || tooltipElement === null) return;
    const element = tooltipElement;
    const measure = () => {
      measuredWidth = element.offsetWidth;
      measuredHeight = element.offsetHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  });

  const style = $derived(
    docked
      ? ""
      : (() => {
          const tooltipWidth = Math.min(
            measuredWidth || 280,
            Math.max(0, width - EDGE * 2),
          );
          const tooltipHeight = Math.min(
            measuredHeight || 160,
            Math.max(0, height - EDGE * 2),
          );
          const preferredX =
            anchor.x + OFFSET + tooltipWidth <= width - EDGE
              ? anchor.x + OFFSET
              : anchor.x - OFFSET - tooltipWidth;
          const preferredY =
            anchor.y + OFFSET + tooltipHeight <= height - EDGE
              ? anchor.y + OFFSET
              : anchor.y - OFFSET - tooltipHeight;
          const left = Math.max(
            EDGE,
            Math.min(preferredX, width - tooltipWidth - EDGE),
          );
          const top = Math.max(
            EDGE,
            Math.min(preferredY, height - tooltipHeight - EDGE),
          );
          return `left:${left}px;top:${top}px;`;
        })(),
  );

  // Collapse identical field blocks for default rendering only (#385). Public
  // `inspection.members` stays full for custom content / oninspect.
  const displayMembers = $derived(
    collapseIdenticalDisplayMembers(inspection.members, inspection.focus),
  );

  const shownMembers = $derived(
    inspection.state === "transient"
      ? displayMembers.slice(0, 8)
      : displayMembers,
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={tooltipElement}
  {id}
  class="gg-tooltip"
  class:gg-tooltip-interactive={interactive}
  class:gg-tooltip-pinned={inspection.state === "pinned"}
  class:gg-tooltip-docked={docked}
  {style}
  role={interactive && inspection.state === "pinned" ? "dialog" : "tooltip"}
  tabindex={interactive && inspection.state === "pinned" ? -1 : undefined}
  aria-label={interactive && inspection.state === "pinned"
    ? "Data inspection"
    : undefined}
  onpointerenter={onenter}
  onpointerleave={onleave}
  onkeydown={(event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onclose?.("keyboard");
    }
  }}
>
  {#if content !== undefined}
    {@render content(inspection)}
  {:else}
    {#if inspection.mode === "x" || inspection.mode === "y"}
      <div class="gg-tooltip-axis">{inspection.axisLabel}</div>
    {/if}
    <div class="gg-tooltip-members">
      {#each shownMembers as member, index (`${member.layerIndex}:${String(member.key)}:${index}`)}
        <dl class:gg-tooltip-focus={member === inspection.focus}>
          {#each member.fields as field (field.channel)}
            <dt>{field.field}</dt>
            <dd>{formatTooltipCell(field.value)}</dd>
          {/each}
        </dl>
      {/each}
    </div>
    {#if inspection.state === "transient" && inspection.members.length > 8}
      <p class="gg-tooltip-more">
        +{inspection.members.length - 8} more · pin to inspect all
      </p>
    {:else if inspection.state === "transient"}
      <p class="gg-tooltip-hint">Click to pin</p>
    {/if}
  {/if}
  {#if inspection.state === "pinned" && interactive}
    <button type="button" onclick={() => onclose?.("pointer")}>Close</button>
  {/if}
</div>

<style>
  .gg-tooltip {
    position: absolute;
    pointer-events: none;
    z-index: auto;
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
    border: 1px solid
      var(
        --gg-tooltipBorder,
        var(
          --gg-tooltip-border,
          var(--gg-theme-tooltipBorder, var(--gg-grid, #b8b8b8))
        )
      );
    border-radius: var(--gg-tooltip-radius, 3px);
    padding: 8px 10px;
    font-family: var(--gg-font-family, inherit);
    font-size: 16px;
    line-height: 1.4;
    max-width: min(280px, calc(100% - 16px));
    max-height: min(320px, calc(100% - 16px));
    box-sizing: border-box;
    overflow: auto;
    overflow-wrap: anywhere;
    box-shadow: var(--gg-tooltip-shadow, none);
    user-select: text;
  }

  .gg-tooltip-docked {
    position: absolute;
    inset: calc(100% + 8px) 0 auto;
    width: auto;
    max-width: none;
    max-height: 240px;
    box-sizing: border-box;
  }

  .gg-tooltip-interactive.gg-tooltip-pinned {
    pointer-events: auto;
  }

  .gg-tooltip-members {
    display: grid;
    gap: 6px;
  }

  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto auto;
    gap: 0 10px;
    contain-intrinsic-size: 28px;
    content-visibility: auto;
  }

  .gg-tooltip-focus {
    font-weight: 600;
  }

  dt {
    font-weight: 600;
  }

  dd {
    margin: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .gg-tooltip-axis {
    margin-bottom: 6px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  .gg-tooltip-more,
  .gg-tooltip-hint {
    margin: 7px 0 0;
    color: color-mix(in srgb, currentColor 65%, transparent);
    font-size: 10px;
  }

  button {
    min-width: 44px;
    min-height: 44px;
    margin-top: 8px;
  }

  @media (forced-colors: active) {
    .gg-tooltip {
      border-color: CanvasText;
      background: Canvas;
      color: CanvasText;
      box-shadow: none;
      forced-color-adjust: auto;
    }
  }
</style>
