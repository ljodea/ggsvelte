import { expect, test } from "@playwright/test";

function relativeLuminance(cssColor: string): number {
  const channels = cssColor
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (channels === undefined || channels.length !== 3) {
    throw new Error(`Expected an sRGB color, got ${cssColor}`);
  }
  const scale = cssColor.startsWith("color(srgb") ? 255 : 1;
  const linear = channels.map((channel) => {
    const value = (channel * scale) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

for (const theme of ["light", "dark"] as const) {
  test(`interaction tool labels meet AA contrast in ${theme} mode`, async ({ page }) => {
    await page.goto(`/examples/interaction/brush-zoom?theme=${theme}`);
    await expect(page.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");

    const pageBackground = await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor);
    for (const name of ["Inspect", "Select area"]) {
      const foreground = await page
        .getByRole("button", { name, exact: true })
        .evaluate((button) => getComputedStyle(button).color);
      expect(
        contrastRatio(foreground, pageBackground),
        `${name} contrast in ${theme} mode`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
}
