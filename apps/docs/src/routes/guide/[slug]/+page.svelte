<script lang="ts">
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

    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      status.textContent = "Copied.";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection?.removeAllRanges();
      selection?.addRange(range);
      status.textContent =
        "Clipboard unavailable. Code selected for manual copy.";
    }
  }
</script>

<!-- Guide markdown is repository-authored catalog content, never user input. -->
<article class="guide prose" onclick={copyGuideCode}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.html}
</article>
