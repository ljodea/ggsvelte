/**
 * Build + write path — renders the card SVGs and regenerates the projection.
 * `build()` is shared with the --check freshness path.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildCards } from "./cards";
import {
  benchmarkChartDarkSiteSvg,
  benchmarkChartSvg,
} from "../../apps/docs/src/lib/benchmarks/charts";

import {
  bundleGzipKb,
  installedVersion,
  OUTPUT_DIR,
  PROJECTION,
  readJson,
  ROOT,
  type BundleResults,
  type BrowserResults,
} from "./results";
import { projectionSource, type ShellFile } from "./projection";

export function build() {
  const browser = readJson("browser.json") as BrowserResults;
  const peers100k = readJson("browser-100k-peers.json") as BrowserResults;
  const bundles = readJson("bundles.json") as BundleResults;
  const cards = buildCards(browser, peers100k);
  const files: ShellFile[] = cards.flatMap((card) => {
    const light = benchmarkChartSvg(card.chart, { width: card.width, height: card.height });
    return [
      { filename: `bench-${card.id}.svg`, body: light },
      { filename: `bench-${card.id}-dark-site.svg`, body: benchmarkChartDarkSiteSvg(light) },
    ];
  });
  // Unchecked cast at a JSON boundary: the svelte package manifest always
  // carries a version; there is no runtime shape to distinguish.
  const svelteManifest = JSON.parse(
    readFileSync(join(ROOT, "packages", "svelte", "package.json"), "utf8"),
  ) as { version: string };
  const versions = {
    ggsvelte: svelteManifest.version,
    svelteplot: installedVersion("svelteplot"),
    layercake: installedVersion("layercake"),
    unovis: installedVersion("@unovis/svelte"),
    tanstack: installedVersion("@tanstack/charts"),
  };
  const bundleKb = {
    ggsvelteKb: bundleGzipKb(bundles, "ggsvelte-svg", "scatter-color"),
    svelteplotKb: bundleGzipKb(bundles, "svelteplot", "scatter-color"),
    layercakeKb: bundleGzipKb(bundles, "layercake", "scatter-color"),
    unovisKb: bundleGzipKb(bundles, "unovis", "scatter-color"),
    tanstackKb: bundleGzipKb(bundles, "tanstack-svelte", "scatter-color"),
  };
  // Stamp both sources so --check staleness covers 100k re-measures.
  const generatedAt = `${browser.generatedAt}; 100k peers ${peers100k.generatedAt}`;
  return { files, cards, versions, bundleKb, generatedAt };
}

export async function write(): Promise<void> {
  const { files, cards, versions, bundleKb, generatedAt } = build();
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const file of files) {
    writeFileSync(join(OUTPUT_DIR, file.filename), file.body);
  }
  writeFileSync(PROJECTION, await projectionSource(files, cards, versions, bundleKb, generatedAt));
  console.log(`wrote ${String(files.length)} benchmark charts to ${OUTPUT_DIR}`);
}
