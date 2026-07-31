import { renderToSVGString, runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

export function scatterSvg(data: { x: number[]; y: number[]; cls: string[] }): string {
  const spec = gg(data, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7 })
    .spec();
  return renderToSVGString(spec, { width: 800, height: 500 });
}

export { runPipeline };
