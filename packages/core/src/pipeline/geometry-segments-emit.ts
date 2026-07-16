/**
 * Push vertical/horizontal rule segments into mutable geometry buffers.
 */
import type { Frame } from "./geometry-shared.js";

export function createSegmentEmitters(input: {
  fx: Frame;
  segments: number[];
  rowIndex: number[];
  onRemoved: () => void;
}): {
  pushVertical: (t: number | undefined, row: number) => void;
  pushHorizontal: (t: number | undefined, row: number) => void;
} {
  const { fx, segments, rowIndex, onRemoved } = input;
  return {
    pushVertical(t, row) {
      if (t === undefined || Number.isNaN(t)) {
        onRemoved();
        return;
      }
      const x = t * fx.innerWidth;
      segments.push(x, 0, x, fx.innerHeight);
      rowIndex.push(row);
    },
    pushHorizontal(t, row) {
      if (t === undefined || Number.isNaN(t)) {
        onRemoved();
        return;
      }
      const y = fx.innerHeight - t * fx.innerHeight;
      segments.push(0, y, fx.innerWidth, y);
      rowIndex.push(row);
    },
  };
}
