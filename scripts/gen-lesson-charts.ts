/**
 * Render the getting-started lesson's step charts to static SVG files.
 *
 * Eight live 838-point plots on one page cost roughly three seconds of
 * hydration each — measured on the built site — which is not a page anyone
 * should have to wait for. The step charts are illustrations of one delta, so
 * they ship as real library output rendered at build time; the inspect step
 * and the finished chart stay live, because interaction is the thing they are
 * there to demonstrate.
 *
 * This is the same shape as gen-gallery-previews: generate into
 * apps/docs/static, project an inventory module, and offer --check for CI.
 *
 *   bun scripts/gen-lesson-charts.ts          # write
 *   bun scripts/gen-lesson-charts.ts --check  # verify committed output
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { renderToSVGString, runPipeline } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import { kyotoSakura } from "../packages/svelte/src/lib/data/index.js";
import {
  ArtifactError,
  defineArtifact,
  defineArtifactGroup,
  formatGeneratedSource,
} from "./artifact.ts";
import { foldSakura, SAKURA_EPOCHS, SAKURA_STEPS } from "./quickstart.js";

const ROOT = resolve(import.meta.dir, "..");
const OUTPUT_DIR = join(ROOT, "apps", "docs", "static", "lesson");
const PROJECTION = join(ROOT, "apps", "docs", "src", "lib", "generated", "lesson-charts.ts");

/**
 * Steps rendered live in the browser, by index into SAKURA_STEPS.
 *
 * None: the finished chart directly below the steps is live and full width,
 * which is where inspection is worth demonstrating. A second live copy of the
 * same 838 points bought nothing and cost another three seconds of hydration.
 */
export const LIVE_STEP_INDEXES: readonly number[] = [];

/**
 * Target width:height of the *data panel*, not the outer SVG. Axis titles (and
 * any other fixed-pixel chrome) still consume height; outer height must leave
 * room for them or the panel flattens. The finished lesson chart has no
 * title/subtitle/caption so the panel keeps more of the outer box.
 */
export const SAKURA_PANEL_ASPECT = 2.5;

/** Nominal plot width for static lesson SVGs; the SVG scales via viewBox. */
export const LESSON_CHART_WIDTH = 660;

/** Probe heights tall enough that chrome still fits while we measure panels. */
const CHROME_PROBE_HEIGHT = 600;

/** Container widths used to build the live-height lookup (includes legend-wrap). */
export const SAKURA_HEIGHT_PROBE_WIDTHS = [360, 480, 560, 660, 800, 1000] as const;

export interface LessonChartEntry {
  /** -1 is the first render, before any step. */
  step: number;
  filename: string;
}

export interface SakuraSizeRow {
  readonly width: number;
  /** Outer plot height that yields {@link SAKURA_PANEL_ASPECT} for the finished fold. */
  readonly height: number;
  readonly panelWidth: number;
  readonly panelHeight: number;
}

function finishedSpec(): PortableSpec {
  const rows = kyotoSakura.map((row) => ({ ...row }));
  return foldSakura(SAKURA_STEPS.length, rows).spec;
}

/**
 * Measure fixed chrome around the data panel for the finished sakura fold at
 * `width`, then return the outer height that makes panel aspect
 * {@link SAKURA_PANEL_ASPECT}.
 */
export function measureSakuraFinishedSize(width: number): SakuraSizeRow {
  const model = runPipeline(finishedSpec(), { width, height: CHROME_PROBE_HEIGHT });
  const panel = model.scene.panels[0];
  if (panel === undefined) {
    throw new Error(`measureSakuraFinishedSize(${String(width)}): no panel`);
  }
  const chromeTop = panel.y;
  const chromeBottom = CHROME_PROBE_HEIGHT - panel.y - panel.height;
  const chromeSide = width - panel.width;
  const panelWidth = Math.max(width - chromeSide, 1);
  const panelHeight = panelWidth / SAKURA_PANEL_ASPECT;
  const height = Math.round(chromeTop + panelHeight + chromeBottom);
  // Re-probe at the chosen outer height so the exported row matches render.
  const check = runPipeline(finishedSpec(), { width, height });
  const checked = check.scene.panels[0];
  if (checked === undefined) {
    throw new Error(`measureSakuraFinishedSize(${String(width)}): re-probe has no panel`);
  }
  return {
    width,
    height,
    panelWidth: checked.width,
    panelHeight: checked.height,
  };
}

/** Lookup table: container width → outer height for the live finished chart. */
export function buildSakuraFinishedSizeTable(
  widths: readonly number[] = SAKURA_HEIGHT_PROBE_WIDTHS,
): readonly SakuraSizeRow[] {
  return widths.map((width) => measureSakuraFinishedSize(width));
}

/**
 * Interpolate outer height for an arbitrary container width from the measured
 * table. Build-time chrome (not browser measurement) — avoids a second fold
 * on mobile (#972).
 */
export function sakuraFinishedHeight(
  containerWidth: number,
  table: readonly SakuraSizeRow[],
): number {
  if (table.length === 0) throw new Error("sakuraFinishedHeight: empty size table");
  const first = table.at(0);
  if (first === undefined) throw new Error("sakuraFinishedHeight: empty size table");
  if (containerWidth <= first.width) return first.height;
  const last = table.at(-1);
  if (last === undefined) throw new Error("sakuraFinishedHeight: empty size table");
  if (containerWidth >= last.width) {
    // Extrapolate past the last probe with the same panel aspect implied by
    // the last two points when possible.
    if (table.length < 2) return last.height;
    const prev = table.at(-2);
    if (prev === undefined) return last.height;
    const slope = (last.height - prev.height) / (last.width - prev.width);
    return Math.round(last.height + slope * (containerWidth - last.width));
  }
  for (let i = 1; i < table.length; i += 1) {
    const a = table.at(i - 1);
    const b = table.at(i);
    if (a === undefined || b === undefined) break;
    if (containerWidth <= b.width) {
      const t = (containerWidth - a.width) / (b.width - a.width);
      return Math.round(a.height + t * (b.height - a.height));
    }
  }
  return last.height;
}

const SIZE_TABLE = buildSakuraFinishedSizeTable();
const LESSON_SIZE =
  SIZE_TABLE.find((row) => row.width === LESSON_CHART_WIDTH) ??
  SIZE_TABLE.at(0) ??
  (() => {
    throw new Error("SAKURA size table is empty");
  })();

/**
 * Outer height for static lesson SVGs. Chosen so the *finished* fold's data
 * panel is ~{@link SAKURA_PANEL_ASPECT}:1 after axis chrome (no title/subtitle
 * /caption on the finished lesson chart). Early steps have less chrome, so
 * their panels are taller at the same outer size (accepted: the progressive
 * lesson is not the reference figure).
 */
export const LESSON_CHART_HEIGHT = LESSON_SIZE.height;

export function lessonChartFilename(step: number): string {
  return step < 0 ? "first-render.svg" : `step-${String(step + 1)}.svg`;
}

/** Every chart the page shows statically, first render first. */
export function staticLessonSteps(): number[] {
  const steps = [-1];
  for (let index = 0; index < SAKURA_STEPS.length; index += 1) {
    if (!LIVE_STEP_INDEXES.includes(index)) steps.push(index);
  }
  return steps;
}

/**
 * GeomText has no fontStyle yet. Stamp italic on epoch-name glyphs in the
 * static lesson SVGs so they match the live chart's CSS workaround.
 */
export function italicizeEpochNames(svg: string): string {
  let out = svg;
  for (const band of SAKURA_EPOCHS) {
    const escaped = band.epoch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(`(<text\\b[^>]*?)(\\s*>${escaped}</text>)`, "g"),
      (_match, open: string, close: string) =>
        open.includes("font-style") ? `${open}${close}` : `${open} font-style="italic"${close}`,
    );
  }
  return out;
}

export function renderLessonChart(step: number): string {
  const rows = kyotoSakura.map((row) => ({ ...row }));
  // Rendered at the width the step gives them, which is wide enough for the
  // record callouts (the ladder in the component uses the same threshold).
  const { spec } = foldSakura(step + 1, rows);
  // renderToSVGString already emits xmlns and viewBox, which is what makes the
  // output valid as a standalone image.
  const svg = renderToSVGString(spec, {
    width: LESSON_CHART_WIDTH,
    height: LESSON_CHART_HEIGHT,
  });
  return `${italicizeEpochNames(svg)}\n`;
}

function projection(entries: readonly LessonChartEntry[]): Promise<string> {
  // Preserve the historical oxfmt path string for byte-stable output (#783 review).
  return formatGeneratedSource(
    "lesson-charts.ts",
    `// Generated by scripts/gen-lesson-charts.ts. Do not edit.
// Static renders of the getting-started lesson steps; regenerate with
// \`bun run lesson:charts:gen\`.
export interface LessonChartEntry {
  step: number;
  filename: string;
}

export interface SakuraSizeRow {
  readonly width: number;
  readonly height: number;
  readonly panelWidth: number;
  readonly panelHeight: number;
}

/** Target width:height of the data panel (not the outer SVG). */
export const SAKURA_PANEL_ASPECT = ${String(SAKURA_PANEL_ASPECT)};

export const LESSON_CHART_WIDTH = ${String(LESSON_CHART_WIDTH)};
/** Outer height so the finished fold's panel is ~SAKURA_PANEL_ASPECT:1 after chrome. */
export const LESSON_CHART_HEIGHT = ${String(LESSON_CHART_HEIGHT)};

/**
 * Measured outer heights for the finished sakura fold at common container
 * widths (includes legend wrap). Used by the live plot; do not invent chrome
 * constants by hand.
 */
export const SAKURA_FINISHED_SIZE_TABLE: readonly SakuraSizeRow[] = ${JSON.stringify(SIZE_TABLE)};

/** Interpolate outer height for an arbitrary container width from the table. */
export function sakuraFinishedHeight(containerWidth: number): number {
  const table = SAKURA_FINISHED_SIZE_TABLE;
  const first = table.at(0);
  if (first === undefined) throw new Error("sakuraFinishedHeight: empty size table");
  if (containerWidth <= first.width) return first.height;
  const last = table.at(-1);
  if (last === undefined) throw new Error("sakuraFinishedHeight: empty size table");
  if (containerWidth >= last.width) {
    if (table.length < 2) return last.height;
    const prev = table.at(-2);
    if (prev === undefined) return last.height;
    const slope = (last.height - prev.height) / (last.width - prev.width);
    return Math.round(last.height + slope * (containerWidth - last.width));
  }
  for (let i = 1; i < table.length; i += 1) {
    const a = table.at(i - 1);
    const b = table.at(i);
    if (a === undefined || b === undefined) break;
    if (containerWidth <= b.width) {
      const t = (containerWidth - a.width) / (b.width - a.width);
      return Math.round(a.height + t * (b.height - a.height));
    }
  }
  return last.height;
}

export const LESSON_CHARTS: readonly LessonChartEntry[] = ${JSON.stringify(entries)};

/** Step indexes rendered live in the browser (interaction is the point). */
export const LIVE_STEP_INDEXES: readonly number[] = ${JSON.stringify([...LIVE_STEP_INDEXES])};
`,
  );
}

function lessonChartEntries(): LessonChartEntry[] {
  return staticLessonSteps().map((step) => ({
    step,
    filename: lessonChartFilename(step),
  }));
}

function lessonArtifacts(entries: readonly LessonChartEntry[]) {
  const svgMembers = entries.map((entry) =>
    defineArtifact({
      path: join(OUTPUT_DIR, entry.filename),
      label: entry.filename,
      regenerateWith: "lesson:charts:gen",
      build: () => renderLessonChart(entry.step),
    }),
  );
  const projectionMember = defineArtifact({
    path: PROJECTION,
    label: "apps/docs/src/lib/generated/lesson-charts.ts",
    regenerateWith: "lesson:charts:gen",
    build: () => projection(entries),
  });
  return defineArtifactGroup({
    regenerateWith: "lesson:charts:gen",
    members: [...svgMembers, projectionMember],
    extraCheck: () => {
      // An extra file left behind would still be served.
      let present: string[] = [];
      try {
        present = readdirSync(OUTPUT_DIR);
      } catch {
        present = [];
      }
      const expected = new Set(entries.map((entry) => entry.filename));
      for (const file of present) {
        if (!expected.has(file)) {
          throw new ArtifactError({
            status: "STALE",
            path: join(OUTPUT_DIR, file),
            regenerateWith: "lesson:charts:gen",
            label: file,
          });
        }
      }
    },
    extraWrite: () => {
      // Members already wrote; nothing else. Wipe happens before write below.
    },
  });
}

export async function generateLessonCharts(options: { check?: boolean } = {}): Promise<{
  entries: LessonChartEntry[];
  stale: string[];
}> {
  const entries = lessonChartEntries();
  const group = lessonArtifacts(entries);
  if (options.check === true) {
    try {
      await group.check();
      return { entries, stale: [] };
    } catch (error) {
      if (error instanceof ArtifactError) {
        return {
          entries,
          stale: [error.because?.artifactPath ?? error.artifactPath].map((p) => {
            const base = p.split("/").pop() ?? p;
            return base === "lesson-charts.ts" || p.endsWith("lesson-charts.ts")
              ? "lesson-charts.ts"
              : base;
          }),
        };
      }
      throw error;
    }
  }
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  // Write SVGs + projection via protocol (dir pre-wiped so orphans cannot remain).
  for (const entry of entries) {
    writeFileSync(join(OUTPUT_DIR, entry.filename), renderLessonChart(entry.step));
  }
  writeFileSync(PROJECTION, await projection(entries));
  return { entries, stale: [] };
}

if (import.meta.main) {
  const entries = lessonChartEntries();
  const group = lessonArtifacts(entries);
  if (process.argv.includes("--check")) {
    await group.cli(["--check"]);
  } else {
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
    await group.write();
    console.log(`wrote ${String(entries.length)} lesson charts to ${OUTPUT_DIR}`);
  }
}
