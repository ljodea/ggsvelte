/**
 * Scene-level SVG assembly: panel chrome + sceneLabel + sceneToSVGString.
 * Chrome helpers stay file-private (only used by sceneToSVGString).
 */
import type { Scene, SceneLegend, ScenePanel } from "./scene.js";
import { STRIP_BAND } from "./scene.js";
import { LEGEND_ROW_HEIGHT } from "./legend.js";
import type { ThemeTokens } from "./theme.js";
import { themeVar } from "./theme.js";
import { escapeXML, px } from "./render-svg-format.js";
import { renderBatch } from "./render-svg-marks.js";

function renderPanelAxes(panel: ScenePanel, theme: ThemeTokens): string {
  const parts: string[] = [];
  const axisText = themeVar("axisText", theme);
  const axisLine = themeVar("axisLine", theme);
  const tickColor = themeVar("tickColor", theme);
  if (panel.axisX !== null) {
    parts.push(
      `<g class="gg-axis gg-axis-x" transform="translate(${px(panel.x)},${px(panel.y + panel.height)})">`,
    );
    if (theme.axisLineX) {
      parts.push(
        `<line class="gg-axis-line" x1="0" y1="0" x2="${px(panel.width)}" y2="0" stroke="${axisLine}" stroke-width="${px(theme.axisLineWidth)}" vector-effect="non-scaling-stroke"/>`,
      );
    }
    for (const tick of panel.axisX) {
      const minor = tick.kind === "minor";
      parts.push(
        `<g class="gg-tick${minor ? " gg-tick-minor" : ""}" transform="translate(${px(tick.pos)},0)">`,
      );
      if (!minor) parts.push(`<title>${escapeXML(tick.fullLabel ?? tick.label)}</title>`);
      if (theme.ticksX) {
        parts.push(
          `<line y2="${px(minor ? theme.tickLength / 2 : theme.tickLength)}" stroke="${tickColor}" stroke-width="${px(theme.tickWidth)}"${minor ? ' opacity="0.5"' : ""} vector-effect="non-scaling-stroke"/>`,
        );
      }
      if (tick.label !== "") {
        parts.push(
          `<text y="${px((theme.ticksX ? theme.tickLength : 0) + 3)}" dy="0.71em" text-anchor="middle" fill="${axisText}" font-size="${px(theme.axisTextSize)}" font-weight="${theme.fontWeight}">${escapeXML(tick.label)}</text>`,
        );
      }
      parts.push("</g>");
    }
    parts.push("</g>");
  }
  if (panel.axisY !== null) {
    parts.push(
      `<g class="gg-axis gg-axis-y" transform="translate(${px(panel.x)},${px(panel.y)})">`,
    );
    if (theme.axisLineY) {
      parts.push(
        `<line class="gg-axis-line" x1="0" y1="0" x2="0" y2="${px(panel.height)}" stroke="${axisLine}" stroke-width="${px(theme.axisLineWidth)}" vector-effect="non-scaling-stroke"/>`,
      );
    }
    for (const tick of panel.axisY) {
      const minor = tick.kind === "minor";
      parts.push(
        `<g class="gg-tick${minor ? " gg-tick-minor" : ""}" transform="translate(0,${px(tick.pos)})">`,
      );
      if (!minor) parts.push(`<title>${escapeXML(tick.fullLabel ?? tick.label)}</title>`);
      if (theme.ticksY) {
        parts.push(
          `<line x2="-${px(minor ? theme.tickLength / 2 : theme.tickLength)}" stroke="${tickColor}" stroke-width="${px(theme.tickWidth)}"${minor ? ' opacity="0.5"' : ""} vector-effect="non-scaling-stroke"/>`,
        );
      }
      if (tick.label !== "") {
        parts.push(
          `<text x="-${px((theme.ticksY ? theme.tickLength : 0) + 3)}" dy="0.32em" text-anchor="end" fill="${axisText}" font-size="${px(theme.axisTextSize)}" font-weight="${theme.fontWeight}">${escapeXML(tick.label)}</text>`,
        );
      }
      parts.push("</g>");
    }
    parts.push("</g>");
  }
  return parts.join("");
}

/** Facet strip: a subtle band + centered label above the panel. */
function renderStrip(panel: ScenePanel, scene: Scene): string {
  if (panel.strip === "") return "";
  const ink = themeVar("ink", scene.theme);
  const stripFill = themeVar("grid", scene.theme);
  const top = panel.y - STRIP_BAND;
  return (
    `<g class="gg-strip" transform="translate(${px(panel.x)},${px(top)})">` +
    `<rect width="${px(panel.width)}" height="${px(STRIP_BAND - 2)}" fill="${stripFill}"/>` +
    `<text x="${px(panel.width / 2)}" y="${px((STRIP_BAND - 2) / 2)}" dy="0.32em" text-anchor="middle" fill="${ink}" font-size="${px(scene.theme.stripSize)}" font-weight="${scene.theme.stripWeight}">${escapeXML(panel.strip)}</text>` +
    "</g>"
  );
}

/** Plot-level axis titles, positioned against the panel grid's extents. */
function renderAxisTitles(scene: Scene): string {
  const ink = themeVar("ink", scene.theme);
  const panels = scene.panels;
  if (panels.length === 0) return "";
  const gridLeft = Math.min(...panels.map((p) => p.x));
  const gridRight = Math.max(...panels.map((p) => p.x + p.width));
  const gridTop = Math.min(...panels.map((p) => p.y));
  const gridBottom = Math.max(...panels.map((p) => p.y + p.height));
  const parts: string[] = [];
  if (scene.axes.x.title !== "") {
    parts.push(
      `<text class="gg-axis-title" x="${px((gridLeft + gridRight) / 2)}" y="${px(gridBottom + 32)}" text-anchor="middle" fill="${ink}" font-size="${px(scene.theme.axisTitleSize)}" font-weight="${scene.theme.axisTitleWeight}">${escapeXML(scene.axes.x.title)}</text>`,
    );
  }
  if (scene.axes.y.title !== "") {
    parts.push(
      `<text class="gg-axis-title" transform="translate(12,${px((gridTop + gridBottom) / 2)}) rotate(-90)" text-anchor="middle" fill="${ink}" font-size="${px(scene.theme.axisTitleSize)}" font-weight="${scene.theme.axisTitleWeight}">${escapeXML(scene.axes.y.title)}</text>`,
    );
  }
  return parts.join("");
}

function renderGrid(panel: ScenePanel, theme: ThemeTokens): string {
  const dash = theme.gridDasharray === "" ? "" : ` stroke-dasharray="${theme.gridDasharray}"`;
  const parts: string[] = [];
  const hasMinorX = theme.gridX && (panel.grid.minorX?.length ?? 0) > 0;
  const hasMinorY = theme.gridY && (panel.grid.minorY?.length ?? 0) > 0;
  if (hasMinorX || hasMinorY) {
    parts.push(
      `<g class="gg-grid gg-grid-minor" stroke="${themeVar("grid", theme)}" stroke-width="${px(theme.gridWidth)}"${dash} opacity="0.5" vector-effect="non-scaling-stroke">`,
    );
    if (hasMinorX)
      for (const gx of panel.grid.minorX ?? []) {
        parts.push(`<line x1="${px(gx)}" y1="0" x2="${px(gx)}" y2="${px(panel.height)}"/>`);
      }
    if (hasMinorY)
      for (const gy of panel.grid.minorY ?? []) {
        parts.push(`<line x1="0" y1="${px(gy)}" x2="${px(panel.width)}" y2="${px(gy)}"/>`);
      }
    parts.push("</g>");
  }
  parts.push(
    `<g class="gg-grid" stroke="${themeVar("grid", theme)}" stroke-width="${px(theme.gridWidth)}"${dash} vector-effect="non-scaling-stroke">`,
  );
  if (theme.gridX)
    for (const gx of panel.grid.x) {
      parts.push(`<line x1="${px(gx)}" y1="0" x2="${px(gx)}" y2="${px(panel.height)}"/>`);
    }
  if (theme.gridY)
    for (const gy of panel.grid.y) {
      parts.push(`<line x1="0" y1="${px(gy)}" x2="${px(panel.width)}" y2="${px(gy)}"/>`);
    }
  parts.push("</g>");
  return parts.join("");
}

function renderLegend(legend: SceneLegend, theme: ThemeTokens, gradientId: string): string {
  const ink = themeVar("ink", theme);
  const parts: string[] = [
    `<g class="gg-legend gg-legend-${legend.scale}" transform="translate(${px(legend.x)},${px(legend.y)})">`,
  ];
  if (legend.type === "discrete") {
    let contentY = 0;
    if (legend.title !== "") {
      parts.push(
        `<text class="gg-legend-title" x="4" y="11" font-weight="bold" fill="${ink}">${escapeXML(legend.title)}</text>`,
      );
      contentY = 0;
    }
    for (const entry of legend.entries) {
      const swatchY = entry.y + contentY + (LEGEND_ROW_HEIGHT - legend.swatchSize) / 2;
      parts.push(
        `<rect class="gg-legend-swatch" x="4" y="${px(swatchY)}" width="${px(legend.swatchSize)}" height="${px(legend.swatchSize)}" fill="${entry.color}"/>`,
        `<text class="gg-legend-label" x="${px(4 + legend.swatchSize + 6)}" y="${px(entry.y + contentY + LEGEND_ROW_HEIGHT / 2)}" dy="0.32em" fill="${ink}">${escapeXML(entry.label)}</text>`,
      );
    }
  } else if (legend.type === "steps") {
    let stepTop = 0;
    if (legend.title !== "") {
      parts.push(
        `<text class="gg-legend-title" x="4" y="11" font-weight="bold" fill="${ink}">${escapeXML(legend.title)}</text>`,
      );
      stepTop = 18;
    }
    for (const entry of legend.entries) {
      parts.push(
        `<rect class="gg-legend-step" x="4" y="${px(stepTop + entry.y)}" width="${px(legend.stepWidth)}" height="${px(legend.stepHeight)}" fill="${entry.color}"/>`,
        `<text class="gg-legend-label" x="${px(4 + legend.stepWidth + 6)}" y="${px(stepTop + entry.y + legend.stepHeight / 2)}" dy="0.32em" fill="${ink}">${escapeXML(entry.label)}</text>`,
      );
    }
  } else {
    let rampTop = 0;
    if (legend.title !== "") {
      parts.push(
        `<text class="gg-legend-title" x="4" y="11" font-weight="bold" fill="${ink}">${escapeXML(legend.title)}</text>`,
      );
      rampTop = 18;
    }
    const stops = legend.stops
      .map(([offset, color]) => `<stop offset="${px(offset * 100)}%" stop-color="${color}"/>`)
      .join("");
    parts.push(
      `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`,
      `<rect class="gg-legend-ramp" x="4" y="${px(rampTop)}" width="${px(legend.rampWidth)}" height="${px(legend.rampHeight)}" fill="url(#${gradientId})"/>`,
    );
    for (const tick of legend.ticks) {
      parts.push(
        `<text class="gg-legend-label" x="${px(4 + legend.rampWidth + 6)}" y="${px(rampTop + tick.y)}" dy="0.32em" fill="${ink}">${escapeXML(tick.label)}</text>`,
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

/** Accessible name for the plot (deterministic, spec-derived). */
export function sceneLabel(scene: Scene): string {
  if (scene.title !== "") return scene.title;
  const x = scene.axes.x.title;
  const y = scene.axes.y.title;
  if (x !== "" && y !== "") return `Plot of ${y} by ${x}`;
  return "ggsvelte plot";
}

/** Serialize a computed Scene to a standalone SVG string. */
export function sceneToSVGString(scene: Scene): string {
  const panel = scene.panels[0]!;
  const theme = scene.theme;
  const ink = themeVar("ink", theme);
  const parts: string[] = [];
  const label = sceneLabel(scene);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px(scene.width)}" height="${px(scene.height)}" viewBox="0 0 ${px(scene.width)} ${px(scene.height)}" role="img" aria-label="${escapeXML(label)}" class="gg-plot" font-family="${escapeXML(scene.theme.fontFamily)}" font-size="${px(scene.theme.fontSize)}" font-weight="${scene.theme.fontWeight}" text-rendering="optimizeLegibility" shape-rendering="geometricPrecision">`,
    `<title>${escapeXML(label)}</title>`,
  );
  if (theme.paper !== "none") {
    parts.push(
      `<rect class="gg-paper" width="${px(scene.width)}" height="${px(scene.height)}" fill="${themeVar("paper", theme)}"/>`,
    );
  }
  if (scene.title !== "") {
    parts.push(
      `<text class="gg-title" x="${px(panel.x)}" y="${px(scene.theme.titleSize)}" font-size="${px(scene.theme.titleSize)}" font-weight="${scene.theme.titleWeight}" fill="${ink}">${escapeXML(scene.title)}</text>`,
    );
  }
  if (scene.subtitle !== "") {
    const y =
      scene.title === ""
        ? scene.theme.subtitleSize
        : scene.theme.titleSize + scene.theme.subtitleSize + 3;
    parts.push(
      `<text class="gg-subtitle" x="${px(panel.x)}" y="${px(y)}" font-size="${px(scene.theme.subtitleSize)}" font-weight="${scene.theme.subtitleWeight}" fill="${ink}">${escapeXML(scene.subtitle)}</text>`,
    );
  }
  // Panel clip paths (decision 0008/0010 follow-up: marks clip to their
  // panel rect — jitter offsets, se ribbons, and pinned domains stay inside).
  // clipPathUnits is userSpaceOnUse, resolved in the coordinate system of the
  // REFERENCING group, which is panel-translated — so rects sit at 0,0.
  const clips = scene.panels
    .map((p, i) =>
      p.clip === false
        ? ""
        : `<clipPath id="gg-clip-${i}"><rect width="${px(p.width)}" height="${px(p.height)}"/></clipPath>`,
    )
    .join("");
  parts.push(`<defs>${clips}</defs>`);
  for (let i = 0; i < scene.panels.length; i++) {
    const p = scene.panels[i]!;
    parts.push(
      `<g class="gg-panel" data-panel="${i}" transform="translate(${px(p.x)},${px(p.y)})">`,
      theme.panel === "none"
        ? ""
        : `<rect class="gg-panel-background" width="${px(p.width)}" height="${px(p.height)}" fill="${themeVar("panel", theme)}"/>`,
      renderGrid(p, theme),
      `<g class="gg-marks"${p.clip === false ? "" : ` clip-path="url(#gg-clip-${i})"`}>`,
    );
    for (const batch of scene.batches) {
      if (batch.panelIndex === i) parts.push(renderBatch(batch, theme));
    }
    parts.push("</g>");
    if (theme.showPanelBorder) {
      parts.push(
        `<rect class="gg-panel-border" width="${px(p.width)}" height="${px(p.height)}" fill="none" stroke="${themeVar("panelBorder", theme)}" stroke-width="${px(theme.panelBorderWidth)}" vector-effect="non-scaling-stroke"/>`,
      );
    }
    parts.push("</g>", renderStrip(p, scene), renderPanelAxes(p, theme));
  }
  parts.push(renderAxisTitles(scene));
  for (const legend of scene.legends) {
    // Deterministic gradient ids (byte-determinism wins over cross-plot id
    // uniqueness; documented caveat when inlining several plots in one page —
    // the Svelte adapter generates its own unique ids).
    parts.push(renderLegend(legend, theme, `gg-ramp-${legend.scale}`));
  }
  if (scene.caption !== "") {
    parts.push(
      `<text class="gg-caption" x="${px(scene.width - 4)}" y="${px(scene.height - 4)}" font-size="${px(scene.theme.captionSize)}" text-anchor="end" fill="${ink}">${escapeXML(scene.caption)}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}
