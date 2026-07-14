/// <reference lib="dom" />

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

import { renderToSVGString } from "../packages/core/src/index.js";
import type { SpecInput, ThemeName } from "../packages/spec/src/index.js";

const ROOT = dirname(import.meta.dirname);
const OUT = join(ROOT, "artifacts/theme-equivalence");
const SVG_OUT = join(OUT, "svg");
const FONT_DIR = "../../../packages/svelte/src/lib/fonts";
const themes = ["ggplot2", "hrbr", "few"] as const satisfies readonly ThemeName[];

const values = [
  { x: 1, y: 2.2, series: "Alpha" },
  { x: 2, y: 3.1, series: "Alpha" },
  { x: 3, y: 4.7, series: "Alpha" },
  { x: 4, y: 5.4, series: "Alpha" },
  { x: 5, y: 7.2, series: "Alpha" },
  { x: 6, y: 8.1, series: "Alpha" },
  { x: 1, y: 7.5, series: "Beta" },
  { x: 2, y: 6.8, series: "Beta" },
  { x: 3, y: 6.2, series: "Beta" },
  { x: 4, y: 5.1, series: "Beta" },
  { x: 5, y: 4.4, series: "Beta" },
  { x: 6, y: 3.3, series: "Beta" },
  { x: 1, y: 4.1, series: "Gamma" },
  { x: 2, y: 4.8, series: "Gamma" },
  { x: 3, y: 5.3, series: "Gamma" },
  { x: 4, y: 6.4, series: "Gamma" },
  { x: 5, y: 6.1, series: "Gamma" },
  { x: 6, y: 7.0, series: "Gamma" },
];

function spec(theme: ThemeName): SpecInput {
  return {
    data: { values },
    aes: { x: "x", y: "y", color: "series" },
    layers: [
      { geom: "line", params: { linewidth: 1.2 } },
      { geom: "point", params: { size: 3 } },
    ],
    scales: {
      x: { domain: [0, 7], breaks: [1, 2, 3, 4, 5, 6] },
      y: { domain: [0, 10], breaks: [0, 2, 4, 6, 8, 10] },
      color: { range: ["#5DA5DA", "#F17CB0", "#60BD68"] },
    },
    theme,
    labs: {
      title: "Matched theme reference",
      subtitle: "Same data, domains, breaks, colors, and logical viewport",
      x: "Measurement",
      y: "Value",
      color: "Series",
    },
  };
}

function withFontFaces(svg: string): string {
  const css = `<style>
@font-face{font-family:"Roboto Condensed";src:url("${FONT_DIR}/RobotoCondensed-Light.ttf") format("truetype");font-weight:300}
@font-face{font-family:"Roboto Condensed";src:url("${FONT_DIR}/RobotoCondensed-Regular.ttf") format("truetype");font-weight:400}
@font-face{font-family:"Roboto Condensed";src:url("${FONT_DIR}/RobotoCondensed-Bold.ttf") format("truetype");font-weight:700}
</style>`;
  return svg.replace(/(<title>.*?<\/title>)/, `$1${css}`);
}

await mkdir(SVG_OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 720, height: 480 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const metrics: Record<string, unknown> = {};

for (const theme of themes) {
  const svg = withFontFaces(renderToSVGString(spec(theme), { width: 720, height: 480 }));
  const svgPath = join(SVG_OUT, `${theme}.svg`);
  await Bun.write(svgPath, svg);
  await page.goto(pathToFileURL(svgPath).href);
  await page.evaluate(() => document.fonts.ready);
  const fontReady = await page.evaluate(() => document.fonts.check('11.5px "Roboto Condensed"'));
  if (!fontReady) throw new Error(`Roboto Condensed failed to load for ${theme}`);
  await page.locator("svg").screenshot({ path: join(OUT, `ggsvelte-${theme}.png`) });
  metrics[theme] = await page.evaluate(() => {
    const rootSvg = document.querySelector("svg")!;
    const computed = getComputedStyle(rootSvg);
    const grids = [...document.querySelectorAll<SVGLineElement>(".gg-grid line")];
    return {
      width: 1440,
      height: 960,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontReady: document.fonts.check('11.5px "Roboto Condensed"'),
      axisLines: document.querySelectorAll(".gg-axis-line").length,
      panelBorders: document.querySelectorAll(".gg-panel-border").length,
      tickLines: document.querySelectorAll(".gg-tick line").length,
      gridLines: grids.length,
      gridStroke: grids[0] === undefined ? null : getComputedStyle(grids[0]).stroke,
      gridWidth: document.querySelector(".gg-grid")?.getAttribute("stroke-width"),
      xLabels: [...document.querySelectorAll(".gg-axis-x .gg-tick text")].map(
        (node) => node.textContent,
      ),
      yLabels: [...document.querySelectorAll(".gg-axis-y .gg-tick text")].map(
        (node) => node.textContent,
      ),
    };
  });
}

await browser.close();
await Bun.write(join(OUT, "ggsvelte-metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
await Bun.write(
  join(OUT, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ggsvelte theme equivalence</title>
<style>:root{font-family:"Roboto Condensed","Arial Narrow",sans-serif;color:#262626;background:#f4f3ef}body{margin:32px}h1{font-size:34px;margin:0 0 6px}p{font-size:17px;color:#5d5952;margin:0 0 30px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 34px}.pair h2{grid-column:1/-1;margin:0;font-size:24px}.card{background:#fff;padding:10px}.card h3{margin:0 0 8px;font-size:16px}.card img{display:block;width:100%;height:auto}@media(max-width:900px){.pair{grid-template-columns:1fr}}</style></head><body>
<h1>Theme equivalence evidence</h1><p>Matched data, domains, breaks, colors, 720×480 logical viewport, and 2× raster output. R references use Cairo; ggsvelte uses Chromium with its bundled Roboto Condensed.</p>
${themes
  .map(
    (theme) =>
      `<section class="pair"><h2>${theme}</h2><div class="card"><h3>R reference</h3><img src="r-${theme}.png" width="1440" height="960"></div><div class="card"><h3>ggsvelte</h3><img src="ggsvelte-${theme}.png" width="1440" height="960"></div></section>`,
  )
  .join("\n")}</body></html>`,
);
console.log(`Rendered ${themes.length} matched ggsvelte theme references.`);
