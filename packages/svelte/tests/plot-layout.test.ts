import { describe, expect, it } from "vitest";

import {
  isDockedTooltipWidth,
  isNarrowToolsWidth,
  plotRootInlineStyle,
} from "../src/lib/plot-layout.js";

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
