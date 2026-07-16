<script lang="ts">
  import { onMount, tick } from "svelte";

  import {
    formatBoundsDraft,
    validateBoundsDraft,
    type BoundsDraftErrors,
    type BoundsEditorInput,
    type PreciseBoundsApplyEvent,
  } from "./bounds-editor.js";

  const {
    input,
    onapply,
    oncancel = () => {},
    returnFocus = null,
  }: {
    input: BoundsEditorInput;
    onapply: (event: PreciseBoundsApplyEvent) => void;
    oncancel?: () => void;
    returnFocus?: HTMLElement | null;
  } = $props();

  const uid = $props.id();
  const initial = (() => formatBoundsDraft(input))();
  let lowerDraft = $state(initial.lower);
  let upperDraft = $state(initial.upper);
  let errors = $state<BoundsDraftErrors>({});
  let lowerControl = $state<HTMLInputElement | HTMLSelectElement | null>(null);
  let upperControl = $state<HTMLInputElement | HTMLSelectElement | null>(null);
  let finished = false;

  const axisName = $derived(input.axis === "x" ? "horizontal" : "vertical");
  const actionName = $derived(input.action === "select" ? "selection" : "zoom");
  const fieldsetLabel = $derived(`Edit ${axisName} ${actionName} bounds`);
  const hint = $derived(
    input.scale === "time"
      ? "Enter an ISO 8601 date, or a date-time with Z or an explicit offset."
      : input.scale === "band"
        ? "Endpoints include both selected categories."
        : input.scale === "log"
          ? "Enter positive values in ascending domain order."
          : "Enter values in ascending domain order.",
  );

  // A parent may switch axes or replace the committed interval while keeping
  // the inline editor mounted. Only prop changes reset drafts; typing itself
  // does not feed back into this effect.
  $effect(() => {
    const draft = formatBoundsDraft(input);
    lowerDraft = draft.lower;
    upperDraft = draft.upper;
    errors = {};
    finished = false;
  });

  function describedBy(field: "lower" | "upper"): string {
    return `${uid}-hint${errors[field] === undefined ? "" : ` ${uid}-${field}-error`}`;
  }

  function restoreFocus(): void {
    if (returnFocus === null) return;
    returnFocus.focus();
  }

  function resetDraft(): void {
    const draft = formatBoundsDraft(input);
    lowerDraft = draft.lower;
    upperDraft = draft.upper;
    errors = {};
  }

  async function apply(): Promise<void> {
    const result = validateBoundsDraft(input, lowerDraft, upperDraft);
    if (!result.ok) {
      errors = result.errors;
      await tick();
      (errors.lower === undefined ? upperControl : lowerControl)?.focus();
      return;
    }
    errors = {};
    finished = true;
    onapply(result.event);
    restoreFocus();
  }

  function cancel(): void {
    resetDraft();
    finished = true;
    oncancel();
    restoreFocus();
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
  }

  function escapeKey(node: HTMLElement): { destroy: () => void } {
    node.addEventListener("keydown", keydown);
    return { destroy: () => node.removeEventListener("keydown", keydown) };
  }

  onMount(() => {
    void tick().then(() => {
      if (!finished) lowerControl?.focus();
    });
  });
</script>

<form
  class="gg-bounds-editor"
  onsubmit={(event) => {
    event.preventDefault();
    void apply();
  }}
>
  <fieldset aria-label={fieldsetLabel} use:escapeKey>
    <legend>Precise {axisName} bounds</legend>
    <p class="gg-bounds-hint" id={`${uid}-hint`}>{hint}</p>
    <div class="gg-bounds-fields">
      <div class="gg-bounds-field">
        <label for={`${uid}-lower`}>Lower bound</label>
        {#if input.scale === "band"}
          <select
            id={`${uid}-lower`}
            bind:this={lowerControl}
            value={lowerDraft}
            oninput={(event) => {
              lowerDraft = event.currentTarget.value;
            }}
            aria-invalid={errors.lower === undefined ? undefined : "true"}
            aria-describedby={describedBy("lower")}
          >
            {#each input.categories as category, index}
              <option value={String(index)}>{category.label}</option>
            {/each}
          </select>
        {:else}
          <input
            id={`${uid}-lower`}
            bind:this={lowerControl}
            value={lowerDraft}
            oninput={(event) => {
              lowerDraft = event.currentTarget.value;
            }}
            type={input.scale === "time" ? "text" : "number"}
            inputmode={input.scale === "time" ? undefined : "decimal"}
            step={input.scale === "linear" || input.scale === "log"
              ? (input.step ?? "any")
              : undefined}
            autocomplete="off"
            aria-invalid={errors.lower === undefined ? undefined : "true"}
            aria-describedby={describedBy("lower")}
          />
        {/if}
        {#if errors.lower !== undefined}
          <p class="gg-bounds-error" id={`${uid}-lower-error`} role="alert">
            {errors.lower}
          </p>
        {/if}
      </div>
      <div class="gg-bounds-field">
        <label for={`${uid}-upper`}>Upper bound</label>
        {#if input.scale === "band"}
          <select
            id={`${uid}-upper`}
            bind:this={upperControl}
            value={upperDraft}
            oninput={(event) => {
              upperDraft = event.currentTarget.value;
            }}
            aria-invalid={errors.upper === undefined ? undefined : "true"}
            aria-describedby={describedBy("upper")}
          >
            {#each input.categories as category, index}
              <option value={String(index)}>{category.label}</option>
            {/each}
          </select>
        {:else}
          <input
            id={`${uid}-upper`}
            bind:this={upperControl}
            value={upperDraft}
            oninput={(event) => {
              upperDraft = event.currentTarget.value;
            }}
            type={input.scale === "time" ? "text" : "number"}
            inputmode={input.scale === "time" ? undefined : "decimal"}
            step={input.scale === "linear" || input.scale === "log"
              ? (input.step ?? "any")
              : undefined}
            autocomplete="off"
            aria-invalid={errors.upper === undefined ? undefined : "true"}
            aria-describedby={describedBy("upper")}
          />
        {/if}
        {#if errors.upper !== undefined}
          <p class="gg-bounds-error" id={`${uid}-upper-error`} role="alert">
            {errors.upper}
          </p>
        {/if}
      </div>
    </div>
    <div class="gg-bounds-actions">
      <button type="submit">Apply</button>
      <button type="button" onclick={cancel}>Cancel</button>
    </div>
  </fieldset>
</form>

<style>
  .gg-bounds-editor {
    color: var(--gg-text, var(--gg-theme-text, currentColor));
    font: inherit;
  }

  .gg-bounds-editor fieldset {
    min-width: 0;
    margin: 0;
    border: 1px solid
      var(--gg-panelBorder, var(--gg-theme-panelBorder, currentColor));
    padding: 12px;
  }

  .gg-bounds-editor legend {
    padding: 0 4px;
    font-weight: 600;
  }

  .gg-bounds-hint,
  .gg-bounds-error {
    margin: 0 0 8px;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .gg-bounds-error {
    margin: 4px 0 0;
    color: var(--gg-error, var(--gg-theme-error, #a40000));
  }

  .gg-bounds-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .gg-bounds-field {
    display: grid;
    align-content: start;
    gap: 4px;
  }

  .gg-bounds-field label {
    font-weight: 500;
  }

  .gg-bounds-field input,
  .gg-bounds-field select,
  .gg-bounds-actions button {
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    border: 1px solid
      var(--gg-panelBorder, var(--gg-theme-panelBorder, currentColor));
    border-radius: 2px;
    padding: 8px 10px;
    background: var(--gg-panelBg, var(--gg-theme-panelBg, Canvas));
    color: inherit;
    font: inherit;
  }

  .gg-bounds-field input:focus-visible,
  .gg-bounds-field select:focus-visible,
  .gg-bounds-actions button:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  .gg-bounds-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }

  .gg-bounds-actions button {
    cursor: pointer;
  }

  @media (max-width: 359px) {
    .gg-bounds-fields {
      grid-template-columns: 1fr;
    }

    .gg-bounds-actions button {
      flex: 1;
    }
  }

  @media (forced-colors: active) {
    .gg-bounds-editor fieldset,
    .gg-bounds-field input,
    .gg-bounds-field select,
    .gg-bounds-actions button {
      border-color: CanvasText;
    }

    .gg-bounds-error {
      color: MarkText;
    }
  }
</style>
