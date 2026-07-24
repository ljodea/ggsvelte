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
    await page.goto(`/interactions?theme=${theme}`);
    const demo = page.getByRole("region", { name: "Interaction demo" });
    await expect(demo.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");

    const pageBackground = await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor);
    for (const name of ["Inspect", "Select area"]) {
      const foreground = await demo
        .getByRole("button", { name, exact: true })
        .evaluate((button) => getComputedStyle(button).color);
      expect(
        contrastRatio(foreground, pageBackground),
        `${name} contrast in ${theme} mode`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test(`homepage primary CTA preserves theme color after visiting in ${theme} mode`, async ({
    page,
  }) => {
    await page.goto(`/?theme=${theme}`);
    const cta = page.getByRole("link", {
      name: "Getting started",
      exact: true,
    });
    await cta.click();
    await page.goBack();
    await expect(cta).toBeVisible();

    const colors = await cta.evaluate((link) => {
      const style = getComputedStyle(link);
      const visitedRules = [...document.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules]
            .filter(
              (rule): rule is CSSStyleRule =>
                rule instanceof CSSStyleRule &&
                rule.selectorText.includes("a.ui-button--primary:visited"),
            )
            .map((rule) => rule.style.color);
        } catch {
          return [];
        }
      });
      return {
        foreground: style.color,
        background: style.backgroundColor,
        visitedRules,
      };
    });

    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(colors.visitedRules).toContain(
      theme === "dark" ? "rgb(11, 16, 32)" : "rgb(255, 255, 255)",
    );
  });
}
