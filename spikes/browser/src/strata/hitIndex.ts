/**
 * M0a-6 spike: minimal hit index in plot-pixel space.
 *
 * Production will use a quadtree + exact containment tests; the spike only
 * needs to prove that hit resolution is independent of which stratum painted
 * a mark — the capture layer converts client coords to plot px and asks this
 * index, never the DOM.
 */

export type StratumId = 'svg-bottom' | 'canvas' | 'svg-top';

export interface MarkBox {
  id: string;
  /** Which stratum painted the mark — recorded to prove hits are stratum-independent. */
  stratum: StratumId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitIndex {
  add(mark: MarkBox): void;
  /** Topmost hit wins: later-added marks are treated as painted later. */
  hitTest(px: number, py: number): MarkBox | null;
}

export function createHitIndex(marks: readonly MarkBox[] = []): HitIndex {
  const boxes: MarkBox[] = [...marks];
  return {
    add(mark) {
      boxes.push(mark);
    },
    hitTest(px, py) {
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (px >= b.x && px < b.x + b.width && py >= b.y && py < b.y + b.height) {
          return b;
        }
      }
      return null;
    },
  };
}
