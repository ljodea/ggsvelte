<script lang="ts">
  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";
  import GettingStartedGuide from "$lib/components/GettingStartedGuide.svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  /** Phosphor Copy / Check (regular/bold) — must match scripts/llms-markdown.ts. */
  const COPY_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>';
  const CHECK_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>';

  const resetTimers = new Map<string, ReturnType<typeof setTimeout>>();

  async function copyGuideCode(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button[data-copy-code]");
    if (button === null) return;
    const codeId = button.dataset.copyCode;
    if (codeId === undefined) return;
    const block = document.querySelector(`#${CSS.escape(codeId)}`);
    const code = block?.querySelector("code");
    const status = document.querySelector(`#${CSS.escape(`${codeId}-status`)}`);
    if (code === null || code === undefined || status === null) return;

    const previous = resetTimers.get(codeId);
    if (previous !== undefined) clearTimeout(previous);

    const result = await copyText(code.textContent ?? "", code);
    if (result === "copied") {
      button.innerHTML = CHECK_ICON_SVG;
      button.setAttribute("aria-label", "Copied");
      status.textContent = "Copied.";
      status.classList.add("visually-hidden");
      resetTimers.set(
        codeId,
        setTimeout(() => {
          button.innerHTML = COPY_ICON_SVG;
          button.setAttribute("aria-label", "Copy code");
          status.textContent = "";
          resetTimers.delete(codeId);
        }, 2000),
      );
    } else {
      button.innerHTML = COPY_ICON_SVG;
      button.setAttribute("aria-label", "Copy code");
      status.textContent = MANUAL_COPY_STATUS;
      // Manual fallback needs visible instructions (Codex P2).
      status.classList.remove("visually-hidden");
    }
  }

  function enhanceCodeCopy(node: HTMLElement): { destroy: () => void } {
    node.addEventListener("click", copyGuideCode);
    return {
      destroy: () => {
        node.removeEventListener("click", copyGuideCode);
        for (const timer of resetTimers.values()) clearTimeout(timer);
        resetTimers.clear();
      },
    };
  }
</script>

{#if data.page.slug === "getting-started"}
  <GettingStartedGuide />
{:else}
  <!-- Guide markdown is repository-authored catalog content, never user input. -->
  <article class="guide prose" use:enhanceCodeCopy>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.html}
  </article>
{/if}
