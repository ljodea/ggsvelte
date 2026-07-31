import { renderToSVGString, runPipeline } from "@ggsvelte/core/render";
import { aes, gg } from "@ggsvelte/spec/portable";

export function scatterSvg(data: { x: number[]; y: number[]; cls: string[] }): string {
  const spec = gg(data, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7 })
    .toPortable();
  return renderToSVGString(spec, { width: 800, height: 500 });
}

export function scatterPipeline(data: { x: number[]; y: number[]; cls: string[] }): unknown {
  const spec = gg(data, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7 })
    .toPortable();
  return runPipeline(spec, { width: 800, height: 500 });
}
