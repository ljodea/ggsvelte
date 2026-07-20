import { describe, expect, it } from "bun:test";

import { resolveDocsBuildConfig } from "../apps/docs/build-mode.ts";

describe("docs build modes", () => {
  it("keeps local development root-based and origin-safe", () => {
    expect(resolveDocsBuildConfig({})).toEqual({
      mode: "dev",
      base: "",
      canonicalBase: "https://ggsvelte.sh",
      indexable: false,
      analytics: false,
    });
  });

  it("resolves every declared publication mode", () => {
    expect(resolveDocsBuildConfig({ mode: "legacy-full", basePath: "/ggsvelte" })).toMatchObject({
      base: "/ggsvelte",
      canonicalBase: "https://ljodea.github.io/ggsvelte",
      indexable: true,
      analytics: false,
    });
    expect(resolveDocsBuildConfig({ mode: "cloudflare-preview" })).toMatchObject({
      base: "",
      canonicalBase: "https://ggsvelte.sh",
      indexable: false,
      analytics: false,
    });
    expect(resolveDocsBuildConfig({ mode: "cloudflare-production" })).toMatchObject({
      base: "",
      canonicalBase: "https://ggsvelte.sh",
      indexable: true,
      analytics: true,
    });
    expect(
      resolveDocsBuildConfig({ mode: "legacy-migration", basePath: "/ggsvelte" }),
    ).toMatchObject({
      base: "/ggsvelte",
      canonicalBase: "https://ggsvelte.sh",
      indexable: false,
      analytics: false,
    });
  });

  it("fails unknown modes and base-path combinations with the complete matrix", () => {
    for (const input of [
      { mode: "preview" },
      { mode: "cloudflare-production", basePath: "/ggsvelte" },
      { mode: "legacy-full", basePath: "/wrong" },
      { basePath: "/ggsvelte" },
    ]) {
      expect(() => resolveDocsBuildConfig(input)).toThrow("Valid combinations");
    }
  });
});
