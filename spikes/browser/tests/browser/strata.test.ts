/**
 * M0a-6 spike: compositing strata + pointer-events proof in real chromium.
 *
 * Proves the plan's round-2 compositing model: positioned plot root with
 * ordered full-size sibling strata (SVG / canvas / SVG), document order =
 * paint order, per-panel canvas clipping, DPR-correct canvas sizing, a single
 * top event-capture layer over pointer-events:none strata, and the canvas
 * a11y description block.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createHitIndex, type MarkBox } from '../../src/strata/hitIndex';
import {
  canvasCircle,
  createPlotRoot,
  sizeCanvasForDpr,
  svgRect,
  svgText,
  type PlotRoot,
} from '../../src/strata/plotRoot';
import { drawClippedToPanel } from '../../src/strata/panels';

const RED = [255, 0, 0, 255];
const TRANSPARENT = [0, 0, 0, 0];

function pixelAt(ctx: CanvasRenderingContext2D, deviceX: number, deviceY: number): number[] {
  return Array.from(ctx.getImageData(deviceX, deviceY, 1, 1).data);
}

/** Client (viewport) coordinates of a plot-pixel point. */
function clientPoint(plot: PlotRoot, plotX: number, plotY: number): { cx: number; cy: number } {
  const r = plot.root.getBoundingClientRect();
  return { cx: r.left + plotX, cy: r.top + plotY };
}

describe('strata compositing (M0a-6)', () => {
  let plots: PlotRoot[] = [];

  function mount(opts: Parameters<typeof createPlotRoot>[0]): PlotRoot {
    const plot = createPlotRoot(opts);
    document.body.appendChild(plot.root);
    plots.push(plot);
    return plot;
  }

  beforeEach(() => {
    document.body.style.margin = '0';
    window.scrollTo(0, 0);
  });

  afterEach(() => {
    for (const p of plots) p.destroy();
    plots = [];
  });

  describe('structure: document order = paint order', () => {
    it('builds ordered sibling strata under a positioned root, no z-index anywhere', () => {
      const plot = mount({ cssWidth: 300, cssHeight: 200, ariaLabel: 'Test plot' });

      expect(getComputedStyle(plot.root).position).toBe('relative');
      // Exact child order: bottom SVG, canvas, a11y block, top SVG, capture.
      expect(Array.from(plot.root.children)).toEqual([
        plot.svgBottom,
        plot.canvas,
        plot.a11yBlock,
        plot.svgTop,
        plot.capture,
      ]);

      for (const el of [plot.svgBottom, plot.canvas, plot.svgTop, plot.capture]) {
        const cs = getComputedStyle(el);
        expect(cs.position).toBe('absolute');
        // Stacking relies purely on document order — z-index must stay auto.
        expect(cs.zIndex).toBe('auto');
      }

      // All strata are full-size and geometrically coincident.
      const rootRect = plot.root.getBoundingClientRect();
      for (const el of [plot.svgBottom, plot.canvas, plot.svgTop, plot.capture]) {
        const r = el.getBoundingClientRect();
        expect(r.left).toBeCloseTo(rootRect.left, 5);
        expect(r.top).toBeCloseTo(rootRect.top, 5);
        expect(r.width).toBeCloseTo(300, 5);
        expect(r.height).toBeCloseTo(200, 5);
      }
    });
  });

  describe('paint-order proof', () => {
    it('canvas paints over the bottom SVG; top SVG stacks over the canvas (elementsFromPoint order)', () => {
      // strataPointerEvents: 'auto' ONLY so hit testing can see the strata —
      // elementsFromPoint skips pointer-events:none elements entirely.
      const plot = mount({ cssWidth: 300, cssHeight: 200, strataPointerEvents: 'auto' });
      const P = { x: 100, y: 100 }; // known plot pixel where all three strata overlap

      // Bottom SVG: blue "grid" rect covering P.
      const gridRect = svgRect(plot.svgBottom, 50, 50, 200, 100, '#0000ff');
      // Middle canvas: red filled circle at P.
      canvasCircle(plot.ctx, P.x, P.y, 12, '#ff0000');
      // Top SVG: green "legend" rect + text, also covering P.
      const legendRect = svgRect(plot.svgTop, 80, 80, 60, 40, '#00ff00');
      svgText(plot.svgTop, 82, 96, 'legend');

      // Canvas painted at P: readback of its own bitmap (SVG pixels are not
      // readable — this proves only that the canvas stratum painted here).
      expect(pixelAt(plot.ctx, Math.round(P.x * plot.dpr), Math.round(P.y * plot.dpr))).toEqual(RED);

      const { cx, cy } = clientPoint(plot, P.x, P.y);

      // Topmost hit-testable element is the capture layer even with auto strata.
      expect(document.elementFromPoint(cx, cy)).toBe(plot.capture);

      // Full stack at P, top to bottom: capture, top-SVG legend rect, canvas,
      // bottom-SVG grid rect — exactly document order reversed. This is the
      // SVG-over-canvas / canvas-over-SVG compositing proof.
      const stack = document.elementsFromPoint(cx, cy);
      const iCapture = stack.indexOf(plot.capture);
      const iLegend = stack.indexOf(legendRect);
      const iCanvas = stack.indexOf(plot.canvas);
      const iGrid = stack.indexOf(gridRect);
      expect(iCapture).toBeGreaterThanOrEqual(0);
      expect(iLegend).toBeGreaterThan(iCapture);
      expect(iCanvas).toBeGreaterThan(iLegend);
      expect(iGrid).toBeGreaterThan(iCanvas);
    });
  });

  describe('panel clipping within one canvas stratum', () => {
    it('marks drawn outside a panel clip rect are not painted', () => {
      const plot = mount({ cssWidth: 200, cssHeight: 100 });
      const { ctx, dpr } = plot;
      const panelA = { x: 10, y: 10, width: 80, height: 80 };
      const panelB = { x: 110, y: 10, width: 80, height: 80 };

      // Panel A: a rect that overflows A's right edge into the gutter.
      drawClippedToPanel(ctx, panelA, (c) => {
        c.fillStyle = '#ff0000';
        c.fillRect(50, 50, 100, 20); // extends to x=150, must clip at x=90
      });
      // Panel B: a rect that overflows B's left edge into the gutter.
      drawClippedToPanel(ctx, panelB, (c) => {
        c.fillStyle = '#ff0000';
        c.fillRect(90, 50, 40, 10); // starts in the gutter, must clip at x=110
      });

      const d = (v: number) => Math.round(v * dpr);
      // Inside panel A: painted.
      expect(pixelAt(ctx, d(60), d(60))).toEqual(RED);
      expect(pixelAt(ctx, d(89), d(60))).toEqual(RED); // last CSS px column inside A
      // Gutter between panels: both overflowing rects clipped away.
      expect(pixelAt(ctx, d(95), d(55))).toEqual(TRANSPARENT);
      expect(pixelAt(ctx, d(100), d(60))).toEqual(TRANSPARENT);
      // Inside panel B: painted.
      expect(pixelAt(ctx, d(115), d(55))).toEqual(RED);
      // After restore(), the clip is gone: drawing in the gutter works again.
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(95, 90, 2, 2);
      expect(pixelAt(ctx, d(95), d(90))).toEqual(RED);
    });
  });

  describe('DPR correctness', () => {
    it('sizes the backing store to cssSize x dpr at the real devicePixelRatio', () => {
      const dpr = window.devicePixelRatio;
      const plot = mount({ cssWidth: 300, cssHeight: 200 });

      expect(plot.canvas.width).toBe(Math.round(300 * dpr));
      expect(plot.canvas.height).toBe(Math.round(200 * dpr));
      expect(plot.canvas.style.width).toBe('300px');
      expect(plot.canvas.style.height).toBe('200px');
      // CSS box must stay 300x200 regardless of backing-store size.
      const r = plot.canvas.getBoundingClientRect();
      expect(r.width).toBeCloseTo(300, 5);
      expect(r.height).toBeCloseTo(200, 5);

      // A 1-CSS-px vertical line at x=10 lands exactly on device columns
      // [10*dpr, 11*dpr): crisp mapping through the setTransform(dpr,...) recipe.
      plot.ctx.fillStyle = '#ff0000';
      plot.ctx.fillRect(10, 0, 1, 200);
      const left = Math.round(10 * dpr);
      const right = Math.round(11 * dpr);
      expect(pixelAt(plot.ctx, left - 1, 50)).toEqual(TRANSPARENT);
      expect(pixelAt(plot.ctx, left, 50)).toEqual(RED);
      expect(pixelAt(plot.ctx, right - 1, 50)).toEqual(RED);
      expect(pixelAt(plot.ctx, right, 50)).toEqual(TRANSPARENT);
    });

    it('maps CSS px to device px crisply under a simulated dpr=2', () => {
      // Explicit dpr=2 exercises the recipe independent of the test browser's
      // actual devicePixelRatio (headless chromium here runs at dpr=1).
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('2d context unavailable');
      sizeCanvasForDpr(canvas, ctx, 40, 20, 2);

      expect(canvas.width).toBe(80);
      expect(canvas.height).toBe(40);
      expect(canvas.style.width).toBe('40px');
      expect(canvas.style.height).toBe('20px');

      // 1-CSS-px vertical line at x=10 -> device columns 20 and 21, nothing else.
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(10, 0, 1, 20);
      const row = Array.from(ctx.getImageData(19, 10, 4, 1).data);
      expect(row.slice(0, 4)).toEqual(TRANSPARENT); // device x=19
      expect(row.slice(4, 8)).toEqual(RED); // device x=20
      expect(row.slice(8, 12)).toEqual(RED); // device x=21
      expect(row.slice(12, 16)).toEqual(TRANSPARENT); // device x=22

      // Integer-aligned 1-CSS-px geometry stays crisp: no antialiased partial
      // coverage on the boundary columns (alpha is exactly 0 or 255 above).
    });

    it('rounds the backing store at fractional dpr', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('2d context unavailable');
      sizeCanvasForDpr(canvas, ctx, 301, 200, 1.5);
      // 301 * 1.5 = 451.5 -> backing store must be an integer.
      expect(canvas.width).toBe(452);
      expect(Number.isInteger(canvas.width)).toBe(true);
    });
  });

  describe('pointer-events policy: strata inert, single capture layer on top', () => {
    it('elementFromPoint always resolves to the capture layer; hits resolve via the plot-space index', () => {
      const plot = mount({ cssWidth: 300, cssHeight: 200 }); // production policy: strata pointer-events none

      // One mark per stratum, all registered in the same plot-pixel hit index.
      const marks: MarkBox[] = [
        { id: 'grid-cell', stratum: 'svg-bottom', x: 20, y: 20, width: 40, height: 40 },
        { id: 'point-a', stratum: 'canvas', x: 130, y: 90, width: 24, height: 24 },
        { id: 'legend-swatch', stratum: 'svg-top', x: 240, y: 20, width: 30, height: 20 },
      ];
      svgRect(plot.svgBottom, 20, 20, 40, 40, '#0000ff');
      canvasCircle(plot.ctx, 142, 102, 12, '#ff0000');
      svgRect(plot.svgTop, 240, 20, 30, 20, '#00ff00');
      const index = createHitIndex(marks);

      const hits: Array<string | null> = [];
      plot.capture.addEventListener('pointerdown', (e) => {
        const r = plot.capture.getBoundingClientRect();
        hits.push(index.hitTest(e.clientX - r.left, e.clientY - r.top)?.id ?? null);
      });

      const probe = (plotX: number, plotY: number) => {
        const { cx, cy } = clientPoint(plot, plotX, plotY);
        // Real hit testing: the ONLY element the browser will target here is
        // the capture layer, no matter which stratum painted the mark.
        const target = document.elementFromPoint(cx, cy);
        expect(target).toBe(plot.capture);
        // And no stratum appears anywhere in the hit-test stack.
        const stack = document.elementsFromPoint(cx, cy);
        expect(stack).toContain(plot.capture);
        for (const stratum of [plot.svgBottom, plot.canvas, plot.svgTop]) {
          expect(stack).not.toContain(stratum);
        }
        target!.dispatchEvent(
          new PointerEvent('pointerdown', {
            clientX: cx,
            clientY: cy,
            bubbles: true,
            pointerId: 1,
          }),
        );
      };

      probe(40, 40); // center of svg-bottom mark
      probe(142, 102); // center of canvas mark
      probe(255, 30); // center of svg-top mark
      probe(200, 180); // empty plot region

      expect(hits).toEqual(['grid-cell', 'point-a', 'legend-swatch', null]);
    });
  });

  describe('canvas a11y block', () => {
    it('pairs the canvas stratum with an off-screen role=img description', () => {
      const plot = mount({
        cssWidth: 300,
        cssHeight: 200,
        ariaLabel: 'Scatter plot of weight vs height, 500 points',
      });

      // Sibling of the canvas, immediately after it in document order.
      expect(plot.a11yBlock.parentElement).toBe(plot.root);
      expect(plot.canvas.nextElementSibling).toBe(plot.a11yBlock);

      // Accessible-name attributes (getComputedAccessibleNode unavailable in
      // this environment — attribute-level assertion per spike scope).
      expect(plot.a11yBlock.getAttribute('role')).toBe('img');
      expect(plot.a11yBlock.getAttribute('aria-label')).toBe(
        'Scatter plot of weight vs height, 500 points',
      );

      // Visually hidden WITHOUT leaving the accessibility tree.
      const cs = getComputedStyle(plot.a11yBlock);
      expect(cs.display).not.toBe('none');
      expect(cs.visibility).not.toBe('hidden');
      expect(plot.a11yBlock.getAttribute('aria-hidden')).toBeNull();
      const r = plot.a11yBlock.getBoundingClientRect();
      expect(r.width).toBeLessThanOrEqual(1);
      expect(r.height).toBeLessThanOrEqual(1);

      // The canvas itself never intercepts a11y-relevant pointer interaction.
      expect(getComputedStyle(plot.canvas).pointerEvents).toBe('none');
    });
  });
});
