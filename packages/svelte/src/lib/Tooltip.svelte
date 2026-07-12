<script lang="ts">
  /**
   * <Tooltip> — the hover tooltip overlay (plan: "Hover/tooltip/transient
   * brush are overlays; no pipeline re-run").
   *
   * Positioned in plot px at the hit anchor, flipping near the right/bottom
   * edges. Content is a snippet when provided; the default lists the hit
   * layer's field-mapped channels with the source row's values (the
   * RenderModel.layerFields / row() contract).
   */
  import type { Snippet } from "svelte";

  import type { CellValue, RenderModel } from "@ggsvelte/core";
  import type { SceneHit } from "@ggsvelte/core/dom";

  import type { TooltipContext } from "./interaction.js";

  const {
    hit,
    model,
    content,
  }: {
    hit: SceneHit;
    model: RenderModel;
    content?: Snippet<[TooltipContext]> | undefined;
  } = $props();

  const context: TooltipContext = $derived.by(() => {
    const row = hit.rowIndex === null ? null : model.row(hit.rowIndex);
    const fields = (model.layerFields[hit.layerIndex] ?? []).map((f) => ({
      ...f,
      value: row?.[f.field] ?? null,
    }));
    return { hit, row, fields };
  });

  const OFFSET = 10;
  const flipX = $derived(hit.x > model.scene.width * 0.65);
  const flipY = $derived(hit.y > model.scene.height * 0.65);
  const style = $derived(
    (flipX
      ? `right:${model.scene.width - hit.x + OFFSET}px;`
      : `left:${hit.x + OFFSET}px;`) +
      (flipY
        ? `bottom:${model.scene.height - hit.y + OFFSET}px;`
        : `top:${hit.y + OFFSET}px;`),
  );

  function format(value: CellValue): string {
    if (value === null) return "–";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number")
      return String(Math.round(value * 1000) / 1000);
    return String(value);
  }
</script>

<div class="gg-tooltip" {style} role="status">
  {#if content !== undefined}
    {@render content(context)}
  {:else}
    <dl>
      {#each context.fields as field (field.channel)}
        <dt>{field.field}</dt>
        <dd>{format(field.value)}</dd>
      {/each}
    </dl>
  {/if}
</div>

<style>
  .gg-tooltip {
    position: absolute;
    pointer-events: none;
    z-index: auto; /* document order = paint order; the tooltip renders last */
    background: var(--gg-paper, #fff);
    color: var(--gg-ink, #1f2328);
    border: 1px solid var(--gg-grid, rgba(128, 128, 128, 0.4));
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11px;
    line-height: 1.35;
    max-width: 220px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto auto;
    gap: 0 8px;
  }

  dt {
    font-weight: 600;
  }

  dd {
    margin: 0;
    text-align: right;
  }
</style>
