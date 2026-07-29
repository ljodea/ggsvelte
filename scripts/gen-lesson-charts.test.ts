/**
 * The lesson's static step charts must be valid STANDALONE images — they are
 * loaded through <img>, not inlined, so anything an inline SVG gets away with
 * (no xmlns, a duplicated attribute) silently renders nothing.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import { LESSON_CHARTS, LIVE_STEP_INDEXES } from "../apps/docs/src/lib/generated/lesson-charts.ts";
import {
  LESSON_CHART_WIDTH,
  lessonChartFilename,
  renderLessonChart,
  staticLessonSteps,
} from "./gen-lesson-charts.ts";
import { SAKURA_STEPS } from "./quickstart.ts";

const DIR = new URL("../apps/docs/static/lesson", import.meta.url).pathname;

describe("lesson step charts", () => {
  it("covers the first render and every step", () => {
    expect(staticLessonSteps()).toEqual([-1, 0, 1, 2, 3]);
    expect(LESSON_CHARTS.map((entry) => entry.filename)).toEqual(
      staticLessonSteps().map((step) => lessonChartFilename(step)),
    );
    // No step chart is live: the finished chart below them is, and one live
    // 838-point plot per page is the budget.
    expect(LIVE_STEP_INDEXES).toEqual([]);
    expect(LESSON_CHARTS).toHaveLength(SAKURA_STEPS.length + 1);
  });

  it("ships nothing but the charts it declares", () => {
    expect(readdirSync(DIR).toSorted()).toEqual(
      LESSON_CHARTS.map((entry) => entry.filename).toSorted(),
    );
  });

  it("renders each chart as a valid standalone SVG", () => {
    for (const entry of LESSON_CHARTS) {
      const svg = readFileSync(join(DIR, entry.filename), "utf8");
      expect(svg.startsWith("<svg ")).toBe(true);
      // Standalone images need the namespace and exactly one of each sizing
      // attribute; a duplicate makes the document invalid and renders blank.
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      const root = svg.slice(0, svg.indexOf(">") + 1);
      for (const attribute of ["viewBox", "width", "height", "xmlns"]) {
        expect(
          root.split(`${attribute}=`).length - 1,
          `${entry.filename}: ${attribute} appears more than once`,
        ).toBe(1);
      }
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    }
  });

  it("is regenerated from the same fold the page renders", () => {
    for (const entry of LESSON_CHARTS) {
      expect(readFileSync(join(DIR, entry.filename), "utf8")).toBe(renderLessonChart(entry.step));
    }
  });

  it("is rendered wide enough to place its callouts", () => {
    // The step gives the chart the whole column, which is above the ladder's
    // threshold — so the record callouts are drawn. Anything narrower would
    // render the axis text at half size.
    expect(LESSON_CHART_WIDTH).toBeGreaterThan(560);
    const annotated = readFileSync(join(DIR, lessonChartFilename(3)), "utf8");
    expect(annotated).toContain("latest on record");
    expect(annotated).toContain("gg-marks");
  });

  it("italicizes epoch names on static SVGs (GeomText has no fontStyle yet)", () => {
    const withEpochs = readFileSync(join(DIR, lessonChartFilename(2)), "utf8");
    expect(withEpochs).toMatch(/font-style="italic"[^>]*>Medieval warm period</);
    expect(withEpochs).toMatch(/font-style="italic"[^>]*>Little Ice Age</);
    expect(withEpochs).toMatch(/font-style="italic"[^>]*>Industrial era</);
  });
});
