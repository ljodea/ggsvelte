/**
 * Panel layout chrome: labs, axis titles (with coord flip), formatters, legends.
 */
import { resolvePanelLayoutDisplay } from "./panel-layout-chrome-display.js";
import type { PanelLayoutChromeInput } from "./panel-layout-chrome-input.js";
import { resolvePanelLayoutLabs } from "./panel-layout-chrome-labs.js";
import { resolvePanelLayoutLegends } from "./panel-layout-chrome-legends.js";
import type { PanelLayoutChrome } from "./panel-layout-chrome-types.js";

export type { PanelLayoutChrome } from "./panel-layout-chrome-types.js";
export type { PanelLayoutChromeInput } from "./panel-layout-chrome-input.js";

export function resolvePanelLayoutChrome(input: PanelLayoutChromeInput): PanelLayoutChrome {
  const labsChrome = resolvePanelLayoutLabs({
    allFrames: input.allFrames,
    labs: input.labs,
    theme: input.theme,
    height: input.options.height,
  });
  const display = resolvePanelLayoutDisplay({
    flip: input.flip,
    freeX: input.freeX,
    freeY: input.freeY,
    panelScales: input.panelScales,
    scalesConfig: input.scalesConfig,
    xScale: input.xScale,
    yScale: input.yScale,
    xTemporalKind: input.xTemporalKind,
    yTemporalKind: input.yTemporalKind,
    xTitle: labsChrome.xTitle,
    yTitle: labsChrome.yTitle,
    warnings: input.warnings,
  });
  const legends = resolvePanelLayoutLegends({
    legendInputs: input.legendInputs,
    legendOrder: input.legendOrder,
    theme: input.theme,
    options: input.options,
  });

  return {
    flip: input.flip,
    scalesConfig: input.scalesConfig,
    ...labsChrome,
    ...display,
    ...legends,
  };
}
