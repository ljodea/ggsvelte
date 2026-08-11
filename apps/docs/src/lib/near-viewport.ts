/**
 * Fire `onNear` once when `target` is near the viewport, then disconnect.
 *
 * Used to defer heavy live charts (theme/palette specimens) so first paint
 * and above-the-fold work stay cheap (#1037). No idle-load, only intersection.
 *
 * When `IntersectionObserver` is missing, fires immediately so SSR/test
 * environments without IO still mount content.
 */
export function observeNearViewport(
  target: Element,
  onNear: () => void,
  options?: { rootMargin?: string },
): () => void {
  const rootMargin = options?.rootMargin ?? "240px 0px";

  if (typeof IntersectionObserver === "undefined") {
    onNear();
    return () => {};
  }

  let done = false;
  const fire = (): void => {
    if (done) return;
    done = true;
    onNear();
    io.disconnect();
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fire();
    },
    { rootMargin },
  );
  io.observe(target);

  return () => {
    done = true;
    io.disconnect();
  };
}
