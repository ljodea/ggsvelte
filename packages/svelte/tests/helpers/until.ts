/**
 * rAF-poll a predicate until it holds or the timeout elapses. Shared by the
 * browser-mode suites (previously copy-pasted per file with drifting
 * timeouts).
 */
export function until(predicate: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - started > timeout) {
        reject(new Error("until() timed out"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
