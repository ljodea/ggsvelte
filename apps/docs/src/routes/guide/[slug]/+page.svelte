<script lang="ts">
  import { copyText } from "$lib/clipboard";
  import {
    applyGuideCopyUi,
    guideCopyUiAfter,
    guideCopyUiIdle,
  } from "$lib/guide-code-copy";
  import GettingStartedGuide from "$lib/components/GettingStartedGuide.svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

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
    applyGuideCopyUi(button, status, guideCopyUiAfter(result));
    if (result === "copied") {
      resetTimers.set(
        codeId,
        setTimeout(() => {
          applyGuideCopyUi(button, status, guideCopyUiIdle());
          resetTimers.delete(codeId);
        }, 2000),
      );
    }
  }

  /** Delegated copy on prerendered guide HTML — attachment, not `use:action`. */
  function enhanceCodeCopy(node: HTMLElement) {
    node.addEventListener("click", copyGuideCode);
    return () => {
      node.removeEventListener("click", copyGuideCode);
      for (const timer of resetTimers.values()) clearTimeout(timer);
      resetTimers.clear();
    };
  }
</script>

{#if data.page.slug === "getting-started"}
  <GettingStartedGuide />
{:else}
  <!-- Guide markdown is repository-authored catalog content, never user input. -->
  <article class="guide prose" {@attach enhanceCodeCopy}>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.html}
  </article>
{/if}
