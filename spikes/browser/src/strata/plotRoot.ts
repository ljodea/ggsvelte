/**
 * M0a-6 spike: compositing strata plot root.
 *
 * Plan model (round-2 fix): the plot root is a positioned <div> containing an
 * ordered list of full-size sibling strata — <svg> or <canvas> — where
 * document order = paint order (no z-index anywhere). Axes/grids live in the
 * bottom SVG stratum, text/legends/tooltips in the top SVG stratum, marks in
 * the middle canvas stratum. A single transparent capture layer sits on top
 * for all pointer events; every stratum is pointer-events: none in production.
 */

export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface PlotRootOptions {
  cssWidth: number;
  cssHeight: number;
  /** Device pixel ratio for the canvas backing store. Defaults to window.devicePixelRatio. */
  dpr?: number;
  /**
   * Production policy is 'none' (strata never receive events; the capture
   * layer owns them all). 'auto' exists only so tests can interrogate the
   * stacking order via elementsFromPoint — hit testing skips
   * pointer-events:none elements, so they never appear in that list.
   */
  strataPointerEvents?: 'none' | 'auto';
  /** Accessible summary for the canvas stratum's off-screen description block. */
  ariaLabel?: string;
}

export interface PlotRoot {
  root: HTMLDivElement;
  svgBottom: SVGSVGElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  a11yBlock: HTMLDivElement;
  svgTop: SVGSVGElement;
  capture: HTMLDivElement;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
  destroy(): void;
}

/**
 * DPR recipe: backing store = round(css * dpr) device pixels, CSS box pinned
 * via style.width/height, and a single setTransform(dpr, 0, 0, dpr, 0, 0) so
 * all drawing code works in CSS pixel coordinates.
 */
export function sizeCanvasForDpr(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): void {
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fillStratum(el: HTMLElement | SVGElement, pointerEvents: string): void {
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.pointerEvents = pointerEvents;
}

export function createPlotRoot(opts: PlotRootOptions): PlotRoot {
  const {
    cssWidth,
    cssHeight,
    dpr = window.devicePixelRatio,
    strataPointerEvents = 'none',
    ariaLabel = 'Plot',
  } = opts;

  const root = document.createElement('div');
  root.className = 'gg-plot';
  root.style.position = 'relative';
  root.style.width = `${cssWidth}px`;
  root.style.height = `${cssHeight}px`;

  const makeSvg = (cls: string): SVGSVGElement => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('width', String(cssWidth));
    svg.setAttribute('height', String(cssHeight));
    svg.setAttribute('viewBox', `0 0 ${cssWidth} ${cssHeight}`);
    fillStratum(svg, strataPointerEvents);
    return svg;
  };

  // Stratum 1 (bottom): grid / axes SVG.
  const svgBottom = makeSvg('gg-stratum gg-svg-bottom');

  // Stratum 2 (middle): canvas marks. willReadFrequently avoids Chromium's
  // "multiple readback operations" GPU->CPU thrash warning for getImageData.
  const canvas = document.createElement('canvas');
  canvas.className = 'gg-stratum gg-canvas';
  fillStratum(canvas, strataPointerEvents);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  sizeCanvasForDpr(canvas, ctx, cssWidth, cssHeight, dpr);

  // Off-screen a11y description block paired with the canvas stratum
  // (a <desc> cannot live on a <canvas>). Visually hidden, but NOT
  // display:none / visibility:hidden, so it stays in the accessibility tree.
  const a11yBlock = document.createElement('div');
  a11yBlock.className = 'gg-canvas-a11y';
  a11yBlock.setAttribute('role', 'img');
  a11yBlock.setAttribute('aria-label', ariaLabel);
  Object.assign(a11yBlock.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    border: '0',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);

  // Stratum 3 (top): text / legend / tooltip overlay SVG.
  const svgTop = makeSvg('gg-stratum gg-svg-top');

  // Single transparent event-capture layer, last in document order = topmost.
  const capture = document.createElement('div');
  capture.className = 'gg-capture';
  fillStratum(capture, 'auto');
  capture.style.background = 'transparent';
  capture.style.touchAction = 'none';

  root.append(svgBottom, canvas, a11yBlock, svgTop, capture);

  return {
    root,
    svgBottom,
    canvas,
    ctx,
    a11yBlock,
    svgTop,
    capture,
    dpr,
    cssWidth,
    cssHeight,
    destroy() {
      root.remove();
    },
  };
}

/** Convenience: SVG <rect> in a stratum, coordinates in CSS px. */
export function svgRect(
  svg: SVGSVGElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('fill', fill);
  svg.appendChild(rect);
  return rect;
}

/** Convenience: SVG <text> in a stratum. */
export function svgText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  content: string,
  fill = '#000',
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(x));
  text.setAttribute('y', String(y));
  text.setAttribute('fill', fill);
  text.textContent = content;
  svg.appendChild(text);
  return text;
}

/** Filled circle on the canvas stratum, coordinates in CSS px (ctx is dpr-scaled). */
export function canvasCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}
