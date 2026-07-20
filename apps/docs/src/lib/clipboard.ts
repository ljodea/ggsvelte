export const MANUAL_COPY_STATUS = "Clipboard unavailable. Code selected for manual copy.";
export const MANUAL_LINK_COPY_STATUS =
  "Clipboard unavailable. Share link selected for manual copy.";

export function selectText(node: Node): void {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export async function copyText(text: string, fallbackNode: Node): Promise<"copied" | "manual"> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    selectText(fallbackNode);
    return "manual";
  }
}
