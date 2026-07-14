/// <reference lib="dom" />

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

import { renderToSVGString } from "../packages/core/src/index.js";
import area from "../examples/area/stacked/spec.js";
import dodged from "../examples/bar/dodged/spec.js";
import horiz from "../examples/bar/horizontal/spec.js";
import props from "../examples/bar/proportions/spec.js";
import stacked from "../examples/bar/stacked/spec.js";
import box from "../examples/boxplot/by-category/spec.js";
import col from "../examples/col/basic/spec.js";
import valueLabels from "../examples/col/value-labels/spec.js";
import continuous from "../examples/color/continuous/spec.js";
import density from "../examples/density/overlay/spec.js";
import errorbar from "../examples/errorbar/mean-se/spec.js";
import freeY from "../examples/facet/wrap-free-y/spec.js";
import facet from "../examples/facet/wrap/spec.js";
import hist from "../examples/histogram/basic/spec.js";
import line from "../examples/line/multi-series/spec.js";
import time from "../examples/line/time-axis/spec.js";
import canvas from "../examples/point/canvas-scatter/spec.js";
import jitter from "../examples/point/jitter/spec.js";
import log from "../examples/point/log-scale/spec.js";
import scatter from "../examples/point/scatter-color/spec.js";
import rule from "../examples/rule/annotation/spec.js";
import smooth from "../examples/smooth/loess-scatter/spec.js";
import text from "../examples/text/labels/spec.js";

const ROOT = dirname(import.meta.dirname);
const OUT = join(ROOT, "artifacts/fresh-renders");
const SVG_OUT = join(OUT, "svg");
const FONT_DIR = "../../../packages/svelte/src/lib/fonts";

const examples = {
  area,
  box,
  canvas,
  col,
  continuous,
  density,
  dodged,
  errorbar,
  facet,
  freeY,
  hist,
  horiz,
  jitter,
  line,
  log,
  props,
  rule,
  scatter,
  smooth,
  stacked,
  text,
  time,
  valueLabels,
} as const;

function withEmbeddedFontFaces(svg: string): string {
  const css = `<style>
@font-face{font-family:"Roboto Condensed";src:url("${FONT_DIR}/RobotoCondensed-Light.ttf") format("truetype");font-weight:300;font-style:normal}
@font-face{font-family:"Roboto Condensed";src:url("${FONT_DIR}/RobotoCondensed-Regular.ttf") format("truetype");font-weight:400;font-style:normal}
@font-face{font-family:"Roboto Condensed";src:url("${FONT_DIR}/RobotoCondensed-Bold.ttf") format("truetype");font-weight:700;font-style:normal}
</style>`;
  return svg.replace(/(<title>.*?<\/title>)/, `$1${css}`);
}

function gallery(names: readonly string[]): string {
  const figures = names
    .map(
      (name) =>
        `<figure><img src="${name}.png" alt="${name}" width="640" height="400"><figcaption>${name}</figcaption></figure>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ggsvelte fresh renders</title>
<style>
@font-face{font-family:"Roboto Condensed";src:url("../../packages/svelte/src/lib/fonts/RobotoCondensed-Light.ttf") format("truetype");font-weight:300}
@font-face{font-family:"Roboto Condensed";src:url("../../packages/svelte/src/lib/fonts/RobotoCondensed-Regular.ttf") format("truetype");font-weight:400}
@font-face{font-family:"Roboto Condensed";src:url("../../packages/svelte/src/lib/fonts/RobotoCondensed-Bold.ttf") format("truetype");font-weight:700}
:root{font-family:"Roboto Condensed","Arial Narrow",Arial,sans-serif;color:#262626;background:#f4f3ef}
body{margin:clamp(18px,3vw,40px)} h1{font-size:32px;line-height:1.05;margin:0 0 8px} p{font-size:17px;margin:0 0 28px;color:#5a5751}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,640px),1fr));gap:24px;align-items:start}
figure{margin:0;background:#fff;padding:12px;box-shadow:0 1px 0 rgba(0,0,0,.08)}
img{display:block;width:100%;max-width:640px;height:auto;margin:auto;background:#fff}
figcaption{margin:8px auto 0;max-width:640px;font-size:14px;font-weight:400;color:#66615a}
</style></head><body>
<h1>ggsvelte fresh renders</h1><p>Edition 2 · Roboto Condensed · hrbr-style hairline grid · 2× raster evidence</p>
<main class="grid">${figures}</main></body></html>`;
}

await mkdir(SVG_OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 640, height: 400 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const results: {
  name: string;
  bytes: number;
  fontReady: boolean;
  width: number;
  height: number;
}[] = [];

for (const [name, spec] of Object.entries(examples)) {
  const svg = withEmbeddedFontFaces(renderToSVGString(spec, { width: 640, height: 400 }));
  const svgPath = join(SVG_OUT, `${name}.svg`);
  await Bun.write(svgPath, svg);
  await page.goto(pathToFileURL(svgPath).href);
  const fontReady = await page.evaluate(() => document.fonts.check('11.5px "Roboto Condensed"'));
  if (!fontReady) throw new Error(`Roboto Condensed failed to load for ${name}`);
  await page.locator("svg").screenshot({ path: join(OUT, `${name}.png`) });
  results.push({ name, bytes: svg.length, fontReady, width: 1280, height: 800 });
}

await browser.close();
await Bun.write(join(OUT, "index.html"), gallery(Object.keys(examples)));
await Bun.write(
  join(OUT, "summary.json"),
  `${JSON.stringify({ ok: results.length, fail: 0, deviceScaleFactor: 2, results }, null, 2)}\n`,
);

console.log(`Rendered ${results.length} charts at 1280×800 with Roboto Condensed ready.`);
