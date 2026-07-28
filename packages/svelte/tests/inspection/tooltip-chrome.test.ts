import { describe, expect, it } from "vitest";

import { shouldShowTooltipPinHint } from "../../src/lib/inspection/tooltip-chrome.js";

describe("shouldShowTooltipPinHint (#1069)", () => {
  it("shows the pin footer when pin is on and the theme draws a keyline", () => {
    expect(shouldShowTooltipPinHint({ pin: true, tooltipBorder: "#cccccc" })).toBe(true);
    expect(shouldShowTooltipPinHint({ pin: true, tooltipBorder: "  #ebebeb  " })).toBe(true);
  });

  it("hides the pin footer when pin is disabled", () => {
    expect(shouldShowTooltipPinHint({ pin: false, tooltipBorder: "#cccccc" })).toBe(false);
  });

  it("hides the pin footer for flat (gridless) tooltip chrome", () => {
    expect(shouldShowTooltipPinHint({ pin: true, tooltipBorder: "transparent" })).toBe(false);
    expect(shouldShowTooltipPinHint({ pin: true, tooltipBorder: "none" })).toBe(false);
    expect(shouldShowTooltipPinHint({ pin: true, tooltipBorder: " Transparent " })).toBe(false);
  });
});
