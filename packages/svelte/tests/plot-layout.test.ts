import { describe, expect, it } from "vitest";

import {
  isDockedTooltipWidth,
  isNarrowToolsWidth,
  isTooltipDocked,
  plotRootInlineStyle,
  resolveClearLegendX,
  resolveCaptureAriaControls,
  resolvePlotSize,
  tooltipViewportSize,
} from "../src/lib/plot-layout.js";

describe("resolvePlotSize", () => {
  it("uses container measure then assembled then 640 in container mode", () => {
    expect(
      resolvePlotSize({
        width: "container",
        height: undefined,
        containerWidth: 500,
        assembledWidth: 320,
        assembledHeight: 200,
      }),
    ).toEqual({ width: 500, height: 200 });
    expect(
      resolvePlotSize({
        width: undefined,
        height: undefined,
        containerWidth: null,
        assembledWidth: 320,
        assembledHeight: undefined,
      }),
    ).toEqual({ width: 320, height: 400 });
    expect(
      resolvePlotSize({
        width: "container",
        height: undefined,
        containerWidth: null,
        assembledWidth: undefined,
        assembledHeight: undefined,
      }),
    ).toEqual({ width: 640, height: 400 });
  });

  it("uses the fixed width prop without assembled fallback", () => {
    expect(
      resolvePlotSize({
        width: 800,
        height: 300,
        containerWidth: 100,
        assembledWidth: 320,
        assembledHeight: 200,
      }),
    ).toEqual({ width: 800, height: 300 });
  });
});

describe("breakpoint helpers", () => {
  it("narrow tools is width < 560", () => {
    expect(isNarrowToolsWidth(559)).toBe(true);
    expect(isNarrowToolsWidth(560)).toBe(false);
  });

  it("docked tooltip is width < 480", () => {
    expect(isDockedTooltipWidth(479)).toBe(true);
    expect(isDockedTooltipWidth(480)).toBe(false);
  });
});

describe("isTooltipDocked", () => {
  it("requires pinned inspection state and docked width", () => {
    expect(isTooltipDocked({ inspectionState: "pinned", widthPx: 479 })).toBe(true);
    expect(isTooltipDocked({ inspectionState: "pinned", widthPx: 480 })).toBe(false);
    expect(isTooltipDocked({ inspectionState: "transient", widthPx: 100 })).toBe(false);
    expect(isTooltipDocked({ inspectionState: null, widthPx: 100 })).toBe(false);
    expect(isTooltipDocked({ inspectionState: "none", widthPx: 100 })).toBe(false);
  });
});

describe("plotRootInlineStyle", () => {
  it("returns undefined when there is no size box and empty theme", () => {
    expect(
      plotRootInlineStyle({
        needsSizedBox: false,
        containerWidth: true,
        sceneWidth: 640,
        sceneHeight: 400,
        themeStyle: "",
      }),
    ).toBeUndefined();
  });

  it("returns theme alone when no size box is needed", () => {
    expect(
      plotRootInlineStyle({
        needsSizedBox: false,
        containerWidth: false,
        sceneWidth: 100,
        sceneHeight: 50,
        themeStyle: "--gg-theme-interactionInk:#111",
      }),
    ).toBe("--gg-theme-interactionInk:#111");
  });

  it("emits container width 100% and scene height when sized", () => {
    expect(
      plotRootInlineStyle({
        needsSizedBox: true,
        containerWidth: true,
        sceneWidth: 999,
        sceneHeight: 400,
        themeStyle: "",
      }),
    ).toBe("width:100%;height:400px;");
  });

  it("emits fixed scene width/height when sized and not container", () => {
    expect(
      plotRootInlineStyle({
        needsSizedBox: true,
        containerWidth: false,
        sceneWidth: 320,
        sceneHeight: 200,
        themeStyle: "",
      }),
    ).toBe("width:320px;height:200px;");
  });

  it("concatenates size CSS and theme with no extra separator", () => {
    expect(
      plotRootInlineStyle({
        needsSizedBox: true,
        containerWidth: true,
        sceneWidth: 640,
        sceneHeight: 400,
        themeStyle: "--t:1",
      }),
    ).toBe("width:100%;height:400px;--t:1");
  });
});

describe("resolveCaptureAriaControls", () => {
  it("returns plot-scoped tooltip id only when pinned and interactive", () => {
    expect(
      resolveCaptureAriaControls({
        isPinned: true,
        interactiveContent: true,
        plotId: "plot-a",
      }),
    ).toBe("plot-a-tooltip");
    expect(
      resolveCaptureAriaControls({
        isPinned: true,
        interactiveContent: false,
        plotId: "plot-a",
      }),
    ).toBeUndefined();
    expect(
      resolveCaptureAriaControls({
        isPinned: false,
        interactiveContent: true,
        plotId: "plot-a",
      }),
    ).toBeUndefined();
  });
});

describe("tooltipViewportSize", () => {
  it("falls back to scene dims when client dims are nullish", () => {
    expect(
      tooltipViewportSize({
        sceneWidth: 640,
        sceneHeight: 400,
        clientWidth: undefined,
        clientHeight: null,
      }),
    ).toEqual({ width: 640, height: 400 });
  });

  it("clamps to the smaller of scene and client per axis", () => {
    expect(
      tooltipViewportSize({
        sceneWidth: 640,
        sceneHeight: 400,
        clientWidth: 320,
        clientHeight: 500,
      }),
    ).toEqual({ width: 320, height: 400 });
  });

  it("preserves zero client dims via nullish coalesce (not ||)", () => {
    // root?.clientWidth ?? scene — laid-out zero must not fall back to scene.
    expect(
      tooltipViewportSize({
        sceneWidth: 640,
        sceneHeight: 400,
        clientWidth: 0,
        clientHeight: 0,
      }),
    ).toEqual({ width: 0, height: 0 });
  });
});

describe("resolveClearLegendX", () => {
  const legends = [
    { scale: "fill", x: 12 },
    { scale: "color", x: 40 },
  ];

  it("returns the matching legend x when focus is enabled and pressed", () => {
    expect(
      resolveClearLegendX({
        legendFocusEnabled: true,
        pressedScale: "color",
        legends,
      }),
    ).toBe(40);
  });

  it("returns null when legend focus is disabled even if a scale is pressed", () => {
    // Runtime-disable: controller emphasis can leave a pressed scale briefly.
    expect(
      resolveClearLegendX({
        legendFocusEnabled: false,
        pressedScale: "fill",
        legends,
      }),
    ).toBeNull();
  });

  it("returns null when nothing is pressed or no legend matches", () => {
    expect(
      resolveClearLegendX({
        legendFocusEnabled: true,
        pressedScale: null,
        legends,
      }),
    ).toBeNull();
    expect(
      resolveClearLegendX({
        legendFocusEnabled: true,
        pressedScale: "size",
        legends,
      }),
    ).toBeNull();
  });
});
