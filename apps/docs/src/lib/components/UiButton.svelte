<script lang="ts">
  import { Button } from "bits-ui";
  import type { Snippet } from "svelte";

  type Variant = "primary" | "secondary" | "ghost";

  const {
    variant = "secondary",
    class: className = "",
    type = "button",
    disabled = false,
    href,
    onclick,
    children,
  }: {
    variant?: Variant;
    class?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    href?: string;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
  } = $props();

  const classes = $derived(
    `ui-button ui-button--${variant}${className === "" ? "" : ` ${className}`}`,
  );
</script>

{#if href !== undefined}
  <Button.Root class={classes} {href}>
    {@render children()}
  </Button.Root>
{:else}
  <Button.Root class={classes} {type} {disabled} {onclick}>
    {@render children()}
  </Button.Root>
{/if}

<style>
  :global(.ui-button) {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.5rem 0.9rem;
    font: 600 0.875rem/1.2 var(--body-font);
    letter-spacing: -0.01em;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }

  :global(.ui-button:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  :global(.ui-button:disabled),
  :global(.ui-button[aria-disabled="true"]) {
    cursor: not-allowed;
    opacity: 0.45;
  }

  :global(.ui-button--primary) {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 12%, transparent);
  }

  :global(
    .ui-button--primary:hover:not(:disabled):not([aria-disabled="true"])
  ) {
    background: color-mix(in srgb, var(--accent) 88%, var(--ink));
    border-color: color-mix(in srgb, var(--accent) 88%, var(--ink));
  }

  :global(.ui-button--secondary) {
    border-color: var(--line);
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 4%, transparent);
  }

  :global(
    .ui-button--secondary:hover:not(:disabled):not([aria-disabled="true"])
  ) {
    border-color: color-mix(in srgb, var(--ink) 22%, var(--line));
    background: var(--wash);
  }

  :global(.ui-button--ghost) {
    border-color: transparent;
    background: transparent;
    color: var(--ink);
    box-shadow: none;
  }

  :global(.ui-button--ghost:hover:not(:disabled):not([aria-disabled="true"])) {
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }

  :root[data-theme="dark"] :global(.ui-button--primary) {
    color: #0b1020;
  }
</style>
