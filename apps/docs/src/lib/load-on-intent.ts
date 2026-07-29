/**
 * Fire `onIntent` once when the user points at or tabs into `target`.
 *
 * Used for heavy live-chart upgrades. Near-viewport auto-upgrade still pulls
 * the chart stack as soon as a specimen is near the fold, which saturates the
 * main thread (homepage 8–10s click lock; SPA nav stuck until plots finish).
 * Intent-gated load keeps static shells until the user engages the chart.
 */
export function observeUserIntent(target: Element, onIntent: () => void): () => void {
  let done = false;

  const fire = (): void => {
    if (done) return;
    done = true;
    cleanup();
    onIntent();
  };

  const options: AddEventListenerOptions = { capture: true, passive: true };

  function cleanup(): void {
    target.removeEventListener("pointerenter", fire, options);
    target.removeEventListener("focusin", fire, options);
  }

  target.addEventListener("pointerenter", fire, options);
  target.addEventListener("focusin", fire, options);

  return () => {
    done = true;
    cleanup();
  };
}
