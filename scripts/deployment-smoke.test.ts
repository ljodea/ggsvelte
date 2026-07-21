import { describe, expect, it } from "bun:test";

import { cutoverSmokePlan, evaluateSmokeResponse, previewSmokePlan } from "./deployment-smoke.ts";

describe("deployment HTTP smoke assertions", () => {
  it("accepts a response only when status, headers, redirect, and body identity agree", () => {
    expect(
      evaluateSmokeResponse(
        {
          name: "preview artifact",
          url: "https://abc.ggsvelte.pages.dev/artifact.json",
          status: 200,
          headers: { "x-robots-tag": "noindex" },
          bodyIncludes: ["0123456789abcdef"],
        },
        {
          status: 200,
          headers: new Headers({ "X-Robots-Tag": "noindex, nofollow" }),
          body: '{"sourceCommit":"0123456789abcdef"}',
        },
      ),
    ).toEqual([]);
  });

  it("covers immutable preview routes and blocks promotion without noindex", () => {
    const plan = previewSmokePlan(
      "https://feature-cloudflare.ggsvelte.pages.dev",
      "0123456789abcdef0123456789abcdef01234567",
    );

    expect(plan.map(({ name }) => name)).toEqual([
      "preview home",
      "preview deep route",
      "preview schema",
      "preview llms",
      "preview sitemap",
      "preview robots",
      "preview unknown route",
      "preview artifact identity",
    ]);
    for (const expectation of plan) {
      expect(expectation.headers?.["x-robots-tag"]).toBe("noindex");
    }
  });

  it("covers the apex, exact redirects, cleanup paths, and preserved legacy benchmark", () => {
    const plan = cutoverSmokePlan({
      apexOrigin: "https://ggsvelte.sh",
      wwwOrigin: "https://www.ggsvelte.sh",
      productionPagesOrigin: "https://ggsvelte.pages.dev",
      legacyOrigin: "https://ljodea.github.io/ggsvelte",
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
    });

    expect(plan.map(({ name }) => name)).toEqual([
      "apex home",
      "apex deep route",
      "apex schema",
      "apex llms",
      "apex sitemap",
      "apex robots",
      "apex unknown route",
      "apex artifact identity",
      "www path and query redirect",
      "production pages.dev path and query redirect",
      "legacy-base cleanup redirect",
      "external benchmark redirect",
      "legacy known-route migration",
      "legacy benchmark history",
    ]);
    expect(plan.find(({ name }) => name === "www path and query redirect")?.redirectTo).toBe(
      "https://ggsvelte.sh/guide/getting-started?from=www",
    );
    expect(
      plan.find(({ name }) => name === "production pages.dev path and query redirect")?.redirectTo,
    ).toBe("https://ggsvelte.sh/guide/getting-started?from=pages");
  });
});
