/**
 * Scene-level SVG assembly: panel chrome + sceneLabel + sceneToSVGString.
 * Chrome helpers stay file-private (only used by sceneToSVGString).
 */
import { LINETYPE_NAMES } from "@ggsvelte/spec";

import { groupBatchesByPanel } from "./group-batches-by-panel.js";
import { LINETYPE_DASHES } from "./scales/style.js";
import type { Scene, SceneLegend, SceneLegendEntry, ScenePanel } from "./scene.js";
import { STRIP_BAND } from "./scene.js";
import { LEGEND_ROW_HEIGHT } from "./legend.js";
import type { ThemeTokens } from "./theme.js";
import { themeVar } from "./theme.js";
import { escapeXML, px } from "./render-svg-format.js";
import { pointShape, renderBatch } from "./render-svg-marks.js";

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
      if (theme.ticksX && tick.showTick !== false) {
        parts.push(
          `<line y2="${px(minor ? theme.tickLength / 2 : theme.tickLength)}" stroke="${tickColor}" stroke-width="${px(theme.tickWidth)}"${minor ? ' opacity="0.5"' : ""} vector-effect="non-scaling-stroke"/>`,
        );
      }
      if (tick.label !== "" && tick.showLabel !== false) {
        const yOff = (theme.ticksX ? theme.tickLength : 0) + 3;
        const labelSize = tick.labelSize ?? theme.axisTextSize;
        const font = `fill="${axisText}" font-size="${px(labelSize)}" font-weight="${theme.fontWeight}"`;
        if (tick.angle !== undefined && tick.angle !== 0) {
          // Rotated band label: hang below the axis, anchored at the tick.
          parts.push(
            `<text transform="translate(0,${px(yOff)}) rotate(${tick.angle})" text-anchor="end" dominant-baseline="central" ${font}>${escapeXML(tick.label)}</text>`,
          );
        } else if (tick.lines !== undefined && tick.lines.length > 1) {
          // Wrapped band label: one tspan per line, centered.
          const lineH = labelSize * 1.15;
          const tspans = tick.lines
            .map(
              (line, i) =>
                `<tspan x="0" dy="${i === 0 ? "0.71em" : px(lineH)}">${escapeXML(line)}</tspan>`,
            )
            .join("");
          parts.push(`<text y="${px(yOff)}" text-anchor="middle" ${font}>${tspans}</text>`);
        } else {
          parts.push(
            `<text y="${px(yOff)}" dy="0.71em" text-anchor="middle" ${font}>${escapeXML(tick.label)}</text>`,
          );
        }
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
      if (theme.ticksY && tick.showTick !== false) {
        parts.push(
          `<line x2="-${px(minor ? theme.tickLength / 2 : theme.tickLength)}" stroke="${tickColor}" stroke-width="${px(theme.tickWidth)}"${minor ? ' opacity="0.5"' : ""} vector-effect="non-scaling-stroke"/>`,
        );
      }
      if (tick.label !== "" && tick.showLabel !== false) {
        parts.push(
          `<text x="-${px((theme.ticksY ? theme.tickLength : 0) + 3)}" dy="0.32em" text-anchor="end" fill="${axisText}" font-size="${px(tick.labelSize ?? theme.axisTextSize)}" font-weight="${theme.fontWeight}">${escapeXML(tick.label)}</text>`,
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
      `<text class="gg-axis-title" x="${px((gridLeft + gridRight) / 2)}" y="${px(gridBottom + (scene.axes.x.titleOffset ?? 32))}" text-anchor="middle" fill="${ink}" font-size="${px(scene.axes.x.titleSize ?? scene.theme.axisTitleSize)}" font-weight="${scene.theme.axisTitleWeight}">${escapeXML(scene.axes.x.title)}</text>`,
    );
  }
  if (scene.axes.y.title !== "") {
    parts.push(
      `<text class="gg-axis-title" transform="translate(12,${px((gridTop + gridBottom) / 2)}) rotate(-90)" text-anchor="middle" fill="${ink}" font-size="${px(scene.axes.y.titleSize ?? scene.theme.axisTitleSize)}" font-weight="${scene.theme.axisTitleWeight}">${escapeXML(scene.axes.y.title)}</text>`,
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

function renderDiscreteLegendKey(
  entry: SceneLegendEntry,
  x: number,
  y: number,
  size: number,
  ink: string,
): string {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const opacity =
    entry.alpha === undefined || entry.alpha === 1 ? "" : ` opacity="${px(entry.alpha)}"`;
  const styleKey =
    entry.shape !== undefined ||
    entry.size !== undefined ||
    entry.linetype !== undefined ||
    entry.linewidth !== undefined;
  const keyColor = styleKey && entry.color === "#999999" ? ink : entry.color;
  if (entry.shape !== undefined || entry.size !== undefined) {
    const shape = entry.shape ?? "circle";
    const radius = Math.min(size / 2, entry.size ?? size / 2);
    return `<g class="gg-legend-key"${opacity}>${pointShape(shape, centerX, centerY, radius, keyColor)}</g>`;
  }
  if (entry.linetype !== undefined || entry.linewidth !== undefined) {
    const linetype = entry.linetype ?? "solid";
    const dash = LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? [];
    const dashAttr = dash.length === 0 ? "" : ` stroke-dasharray="${dash.join(" ")}"`;
    return `<line class="gg-legend-key" x1="${px(x)}" y1="${px(centerY)}" x2="${px(x + size)}" y2="${px(centerY)}" stroke="${keyColor}" stroke-width="${px(entry.linewidth ?? 1.5)}"${dashAttr}${opacity}/>`;
  }
  return `<rect class="gg-legend-swatch" x="${px(x)}" y="${px(y)}" width="${px(size)}" height="${px(size)}" fill="${entry.color}"${opacity}/>`;
}

function renderDiscreteLegendLabel(
  entry: SceneLegendEntry,
  x: number,
  rowHeight: number,
  labelSize: number,
  ink: string,
): string {
  const lines = entry.lines;
  if (lines === undefined || lines.length <= 1) {
    return `<text class="gg-legend-label" x="${px(x)}" y="${px(entry.y + rowHeight / 2)}" dy="0.32em" font-size="${px(labelSize)}" fill="${ink}">${escapeXML(entry.label)}${entry.fullLabel !== undefined && entry.fullLabel !== entry.label ? `<title>${escapeXML(entry.fullLabel)}</title>` : ""}</text>`;
  }
  const lineHeight = entry.lineHeight ?? labelSize * 1.2;
  const firstY = entry.y + (rowHeight - lines.length * lineHeight) / 2 + lineHeight / 2;
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${px(x)}"${index === 0 ? "" : ` dy="${px(lineHeight)}"`}>${escapeXML(line)}</tspan>`,
    )
    .join("");
  return `<text class="gg-legend-label" x="${px(x)}" y="${px(firstY)}" dy="0.32em" font-size="${px(labelSize)}" fill="${ink}">${tspans}</text>`;
}

function renderLegend(legend: SceneLegend, theme: ThemeTokens, gradientId: string): string {
  const ink = themeVar("ink", theme);
  const horizontal = legend.direction === "horizontal";
  const titleSize = legend.titleSize ?? 11;
  const labelSize = legend.labelSize ?? 11;
  const parts: string[] = [
    `<g class="gg-legend gg-legend-${legend.scale} gg-legend-${legend.position ?? "right"} gg-legend-${legend.direction ?? "vertical"}" transform="translate(${px(legend.x)},${px(legend.y)})">`,
  ];
  const contentTop = legend.title === "" ? 0 : 18;
  if (legend.title !== "") {
    parts.push(
      `<text class="gg-legend-title" x="4" y="11" font-size="${px(titleSize)}" font-weight="bold" fill="${ink}">${escapeXML(legend.title)}</text>`,
    );
  }
  if (legend.type === "discrete") {
    for (const entry of legend.entries) {
      const baseX = (entry.x ?? 0) + 4;
      const rowHeight = entry.height ?? LEGEND_ROW_HEIGHT;
      const swatchY = entry.y + (rowHeight - legend.swatchSize) / 2;
      parts.push(
        renderDiscreteLegendKey(entry, baseX, swatchY, legend.swatchSize, ink),
        renderDiscreteLegendLabel(
          entry,
          baseX + legend.swatchSize + (legend.keyGap ?? 6),
          rowHeight,
          labelSize,
          ink,
        ),
      );
    }
  } else if (legend.type === "steps") {
    for (const entry of legend.entries) {
      const entryX = 4 + (entry.x ?? 0);
      const entryY = contentTop + entry.y;
      parts.push(
        `<rect class="gg-legend-step" x="${px(entryX)}" y="${px(entryY)}" width="${px(legend.stepWidth)}" height="${px(legend.stepHeight)}" fill="${entry.color}"/>`,
        entry.label === ""
          ? ""
          : `<text class="gg-legend-label" x="${px(horizontal ? entryX + legend.stepWidth / 2 : entryX + legend.stepWidth + 6)}" y="${px(horizontal ? entryY + legend.stepHeight + 12 : entryY + legend.stepHeight / 2)}" text-anchor="${horizontal ? "middle" : "start"}" dy="0.32em" font-size="${px(labelSize)}" fill="${ink}">${escapeXML(entry.label)}</text>`,
      );
    }
  } else {
    const stops = legend.stops
      .map(([offset, color]) => `<stop offset="${px(offset * 100)}%" stop-color="${color}"/>`)
      .join("");
    parts.push(
      `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="${horizontal ? "1" : "0"}" y2="${horizontal ? "0" : "1"}">${stops}</linearGradient></defs>`,
      `<rect class="gg-legend-ramp" x="4" y="${px(contentTop)}" width="${px(legend.rampWidth)}" height="${px(legend.rampHeight)}" fill="url(#${gradientId})"/>`,
    );
    for (const tick of legend.ticks) {
      const pos = tick.pos ?? tick.y ?? 0;
      if (legend.showTicks !== false) {
        parts.push(
          horizontal
            ? `<line class="gg-legend-tick" x1="${px(4 + pos)}" y1="${px(contentTop + legend.rampHeight)}" x2="${px(4 + pos)}" y2="${px(contentTop + legend.rampHeight + 4)}" stroke="${ink}"/>`
            : `<line class="gg-legend-tick" x1="${px(4 + legend.rampWidth)}" y1="${px(contentTop + pos)}" x2="${px(4 + legend.rampWidth + 4)}" y2="${px(contentTop + pos)}" stroke="${ink}"/>`,
        );
      }
      if (tick.label === "") continue;
      parts.push(
        `<text class="gg-legend-label" x="${px(horizontal ? 4 + pos : 4 + legend.rampWidth + 6)}" y="${px(horizontal ? contentTop + legend.rampHeight + 12 : contentTop + pos)}" text-anchor="${horizontal ? "middle" : "start"}" dy="0.32em" font-size="${px(labelSize)}" fill="${ink}">${escapeXML(tick.label)}${tick.fullLabel !== undefined && tick.fullLabel !== tick.label ? `<title>${escapeXML(tick.fullLabel)}</title>` : ""}</text>`,
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
  // One O(P+B) panel→batch index (issue #185) instead of re-scanning all
  // batches per panel (O(P·B)). Bucket order preserves original batch list
  // order within each panel.
  const { byPanel } = groupBatchesByPanel(scene.panels.length, scene.batches, false);
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
    for (const batch of byPanel[i]!) parts.push(renderBatch(batch, theme));
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
