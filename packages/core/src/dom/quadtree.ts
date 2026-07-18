/**
 * Static point quadtree for the hit index and CandidateStore nearest/queryRect.
 *
 * HAND-ROLLED, not a d3-quadtree port (documented decision): consumers only
 * need build-once + radius/rect queries over immutable plot-px positions —
 * d3-quadtree's incremental add/remove/cover machinery is dead weight here,
 * and zero runtime dependencies is a project constraint (@sinclair/typebox is
 * the only one). The structure is the classic recursive bucket quadtree: leaf
 * buckets of 16, max depth 12, bbox pruning on every visit. Build is O(n log n);
 * queries are O(log n + k). Pure (no DOM) — safe from the core pure entry.
 */

interface QuadNode {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Point indices (leaf) — undefined once split. */
  bucket: number[] | undefined;
  children: (QuadNode | undefined)[] | undefined;
}

const BUCKET = 16;
const MAX_DEPTH = 12;

export class StaticQuadtree {
  readonly #xs: Float64Array;
  readonly #ys: Float64Array;
  readonly #root: QuadNode | null;

  /** Build from parallel plot-px coordinate arrays (NaN entries skipped). */
  constructor(xs: Float64Array, ys: Float64Array) {
    this.#xs = xs;
    this.#ys = ys;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i]!;
      const y = ys[i]!;
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    if (x0 > x1) {
      this.#root = null;
      return;
    }
    // Square-ish, slightly padded bounds keep splits sane for skewed data.
    const root: QuadNode = {
      x0,
      y0,
      x1: x1 + 1e-6,
      y1: y1 + 1e-6,
      bucket: [],
      children: undefined,
    };
    this.#root = root;
    for (let i = 0; i < xs.length; i++) {
      if (Number.isNaN(xs[i]!) || Number.isNaN(ys[i]!)) continue;
      this.#insert(root, i, 0);
    }
  }

  #insert(node: QuadNode, index: number, depth: number): void {
    while (node.bucket === undefined) {
      node = this.#childFor(node, this.#xs[index]!, this.#ys[index]!);
      depth++;
    }
    node.bucket.push(index);
    if (node.bucket.length > BUCKET && depth < MAX_DEPTH && node.x1 - node.x0 > 1e-9) {
      const bucket = node.bucket;
      node.bucket = undefined;
      node.children = [undefined, undefined, undefined, undefined];
      for (const i of bucket) {
        this.#insert(this.#childFor(node, this.#xs[i]!, this.#ys[i]!), i, depth + 1);
      }
    }
  }

  #childFor(node: QuadNode, x: number, y: number): QuadNode {
    const mx = (node.x0 + node.x1) / 2;
    const my = (node.y0 + node.y1) / 2;
    const qi = (x >= mx ? 1 : 0) + (y >= my ? 2 : 0);
    node.children ??= [undefined, undefined, undefined, undefined];
    let child = node.children[qi];
    if (child === undefined) {
      child = {
        x0: qi & 1 ? mx : node.x0,
        y0: qi & 2 ? my : node.y0,
        x1: qi & 1 ? node.x1 : mx,
        y1: qi & 2 ? node.y1 : my,
        bucket: [],
        children: undefined,
      };
      node.children[qi] = child;
    }
    return child;
  }

  /** Nearest point within `radius` of (x, y), or -1. */
  nearestWithin(x: number, y: number, radius: number): number {
    let best = -1;
    let bestD2 = radius * radius;
    this.#visit(x - radius, y - radius, x + radius, y + radius, (i) => {
      const dx = this.#xs[i]! - x;
      const dy = this.#ys[i]! - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    });
    return best;
  }

  /** All point indices inside the axis-aligned rect (inclusive). */
  queryRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const out: number[] = [];
    this.#visit(x0, y0, x1, y1, (i) => {
      const x = this.#xs[i]!;
      const y = this.#ys[i]!;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) out.push(i);
    });
    return out;
  }

  #visit(x0: number, y0: number, x1: number, y1: number, fn: (index: number) => void): void {
    if (this.#root === null) return;
    const stack: QuadNode[] = [this.#root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.x1 < x0 || node.x0 > x1 || node.y1 < y0 || node.y0 > y1) continue;
      if (node.bucket !== undefined) {
        for (const i of node.bucket) fn(i);
      } else if (node.children !== undefined) {
        for (const child of node.children) if (child !== undefined) stack.push(child);
      }
    }
  }
}
