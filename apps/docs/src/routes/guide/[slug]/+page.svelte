<script lang="ts">
  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

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

    const result = await copyText(code.textContent ?? "", code);
    status.textContent = result === "copied" ? "Copied." : MANUAL_COPY_STATUS;
  }

  function enhanceCodeCopy(node: HTMLElement): { destroy: () => void } {
    node.addEventListener("click", copyGuideCode);
    return { destroy: () => node.removeEventListener("click", copyGuideCode) };
  }
</script>

<!-- Guide markdown is repository-authored catalog content, never user input. -->
<article class="guide prose" use:enhanceCodeCopy>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.html}
</article>
