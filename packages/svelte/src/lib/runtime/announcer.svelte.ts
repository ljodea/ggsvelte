/**
 * Plot live-region announcer extracted from GGPlot shared services.
 *
 * Pure refactor host: move body verbatim; no behavior change.
 */

export type PlotAnnouncer = {
  readonly text: string;
  announce(message: string): void;
  clear(): void;
};

/**
 * Owns the interaction live-region string: clear then set after a microtask
 * so re-announcements of the same message still fire for assistive tech.
 * `clear` is synchronous and queues nothing — a queued blank would run after
 * (and swallow) a message announced earlier in the same tick.
 */
export function createPlotAnnouncer(): PlotAnnouncer {
  let interactionAnnouncement = $state("");
  return {
    get text(): string {
      return interactionAnnouncement;
    },
    announce(message: string): void {
      interactionAnnouncement = "";
      queueMicrotask(() => {
        interactionAnnouncement = message;
      });
    },
    clear(): void {
      interactionAnnouncement = "";
    },
  };
}
