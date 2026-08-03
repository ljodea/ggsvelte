import { describe, expect, test } from "bun:test";

import { primaryNavLinks } from "../apps/docs/src/lib/primary-nav-links";

describe("primaryNavLinks", () => {
  test("marks docs owner and gallery path prefixes", () => {
    const links = primaryNavLinks("/guide/getting-started", "docs");
    expect(links.map((link) => link.label)).toEqual([
      "Docs",
      "Gallery",
      "Themes",
      "Palettes",
      "Reference",
    ]);
    expect(links.find((link) => link.href === "/docs")?.active).toBe(true);
    expect(links.find((link) => link.href === "/examples")?.active).toBe(false);
    expect(links.find((link) => link.href === "/reference")?.active).toBe(false);
  });

  test("marks gallery children and exact themes/palettes", () => {
    expect(
      primaryNavLinks("/examples/point/scatter").find((link) => link.href === "/examples")?.active,
    ).toBe(true);
    expect(primaryNavLinks("/themes").find((link) => link.href === "/themes")?.active).toBe(true);
    expect(primaryNavLinks("/palettes").find((link) => link.href === "/palettes")?.active).toBe(
      true,
    );
  });

  test("marks palettes children without swallowing unrelated paths", () => {
    expect(
      primaryNavLinks("/palettes/ramps").find((link) => link.href === "/palettes")?.active,
    ).toBe(true);
    expect(primaryNavLinks("/palettesque").find((link) => link.href === "/palettes")?.active).toBe(
      false,
    );
  });

  test("marks reference owner", () => {
    expect(
      primaryNavLinks("/reference/cli", "reference").find((link) => link.href === "/reference")
        ?.active,
    ).toBe(true);
    expect(
      primaryNavLinks("/reference/cli", "reference").find((link) => link.href === "/docs")?.active,
    ).toBe(false);
  });
});
