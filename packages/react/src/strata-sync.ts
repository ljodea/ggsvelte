import { planStrata } from "@ggsvelte/core";
import type { Scene } from "@ggsvelte/core";
import { cssColorResolver, drawStratum, sizeCanvasForDpr } from "@ggsvelte/core/dom";
import { mountSceneSvg, type LiveSvgHandle } from "@ggsvelte/core/svg-live";

const STRATUM_STYLE = "position:absolute;inset:0;pointer-events:none";

function destroyLive(lives: Map<number, LiveSvgHandle>, slot: number): void {
  lives.get(slot)?.destroy();
  lives.delete(slot);
}

function ensureCanvas(stack: HTMLDivElement, existing: Element | undefined): HTMLCanvasElement {
  if (existing instanceof HTMLCanvasElement) return existing;
  const canvas = document.createElement("canvas");
  canvas.className = "gg-stratum gg-canvas";
  canvas.style.cssText = STRATUM_STYLE;
  if (existing === undefined) stack.append(canvas);
  else stack.replaceChild(canvas, existing);
  return canvas;
}

function ensureSvgHost(stack: HTMLDivElement, existing: Element | undefined): HTMLElement {
  if (existing instanceof HTMLElement && existing.classList.contains("gg-svg-host")) {
    return existing;
  }
  const host = document.createElement("div");
  host.className = "gg-stratum gg-svg-host";
  host.style.cssText = STRATUM_STYLE;
  if (existing === undefined) stack.append(host);
  else stack.replaceChild(host, existing);
  return host;
}

function paintCanvas(canvas: HTMLCanvasElement, scene: Scene, batches: Scene["batches"]): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) return;
  sizeCanvasForDpr(canvas, ctx, scene.width, scene.height, window.devicePixelRatio || 1);
  drawStratum(ctx, scene, batches, cssColorResolver(canvas));
}

export function destroyAllLives(lives: Map<number, LiveSvgHandle>): void {
  for (const handle of lives.values()) handle.destroy();
  lives.clear();
}

export function withChromeSvg(
  planned: ReturnType<typeof planStrata>,
): ReturnType<typeof planStrata> {
  if (planned.some((s) => s.backend === "svg") || planned.length === 0) return planned;
  return [...planned, { backend: "svg", batches: [] }];
}

export function syncStrata(
  stack: HTMLDivElement,
  scene: Scene,
  strata: ReturnType<typeof planStrata>,
  lives: Map<number, LiveSvgHandle>,
): void {
  while (stack.childElementCount > strata.length) {
    destroyLive(lives, stack.childElementCount - 1);
    stack.lastElementChild?.remove();
  }
  for (const [index, stratum] of strata.entries()) {
    const existing = stack.children[index];
    if (stratum.backend === "canvas") {
      destroyLive(lives, index);
      paintCanvas(ensureCanvas(stack, existing), scene, stratum.batches);
      continue;
    }
    const host = ensureSvgHost(stack, existing);
    if (existing !== host) destroyLive(lives, index);
    const svgScene: Scene = { ...scene, batches: stratum.batches };
    const handle = lives.get(index);
    if (handle === undefined) lives.set(index, mountSceneSvg(host, svgScene));
    else handle.update(svgScene);
  }
}

export function applyAriaLabel(host: HTMLElement, label: string | undefined): void {
  if (label === undefined) return;
  for (const svg of host.querySelectorAll("svg.gg-plot")) {
    svg.setAttribute("aria-label", label);
  }
}
