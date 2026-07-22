import { describe, expect, it } from "bun:test";

import {
  evaluateAssetProbe,
  extractImmutableAssets,
  smokeImmutableAssets,
  type FetchLike,
} from "./deployment-asset-smoke.ts";

describe("deployment immutable asset smoke", () => {
  it("extracts hashed SvelteKit immutable assets from prerendered HTML", () => {
    const html = `
      <link href="./_app/immutable/entry/start.ABC.js" rel="modulepreload">
      <link href="/_app/immutable/nodes/2.DEF.js" rel="modulepreload">
      <script type="module" src="./_app/immutable/entry/app.GHI.js"></script>
      <link href="./_app/immutable/assets/0.JKL.css" rel="stylesheet">
    `;
    expect(extractImmutableAssets(html)).toEqual([
      "_app/immutable/assets/0.JKL.css",
      "_app/immutable/entry/app.GHI.js",
      "_app/immutable/entry/start.ABC.js",
      "_app/immutable/nodes/2.DEF.js",
    ]);
  });

  it("rejects missing assets and HTML served at JS URLs", () => {
    expect(
      evaluateAssetProbe({
        asset: "_app/immutable/nodes/2.missing.js",
        url: "https://ggsvelte.sh/_app/immutable/nodes/2.missing.js",
        status: 404,
        contentType: "text/html",
      }),
    ).toContain("expected HTTP 200");

    expect(
      evaluateAssetProbe({
        asset: "_app/immutable/nodes/2.fake.js",
        url: "https://ggsvelte.sh/_app/immutable/nodes/2.fake.js",
        status: 200,
        contentType: "text/html; charset=utf-8",
      }),
    ).toContain("text/html");

    expect(
      evaluateAssetProbe({
        asset: "_app/immutable/nodes/2.ok.js",
        url: "https://ggsvelte.sh/_app/immutable/nodes/2.ok.js",
        status: 200,
        contentType: "text/javascript",
      }),
    ).toBeNull();
  });

  it("fails when a page's modulepreload graph includes a retired hash", async () => {
    const html = `<link href="./_app/immutable/nodes/2.BAFAK46o.js" rel="modulepreload">`;
    const fetchImpl: FetchLike = (input) => {
      if (input.endsWith("/") || input.endsWith("/guide/getting-started")) {
        return Promise.resolve({
          status: 200,
          headers: { get: () => "text/html" },
          text: () => Promise.resolve(html),
        });
      }
      if (input.includes("2.BAFAK46o.js")) {
        return Promise.resolve({
          status: 404,
          headers: { get: () => "text/html" },
          text: () => Promise.resolve("<!doctype html><title>Not found</title>"),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${input}`));
    };

    const problems = await smokeImmutableAssets({
      baseUrl: "https://ggsvelte.sh",
      paths: ["/"],
      fetchImpl,
    });
    expect(problems.length).toBe(1);
    expect(problems[0]?.message).toContain("2.BAFAK46o.js");
    expect(problems[0]?.message).toContain("404");
  });

  it("passes when every referenced immutable asset returns a non-HTML 200", async () => {
    const html = `
      <link href="./_app/immutable/entry/start.OK.js" rel="modulepreload">
      <link href="./_app/immutable/nodes/2.OK.js" rel="modulepreload">
    `;
    const fetchImpl: FetchLike = (input) => {
      if (input.endsWith("https://example.pages.dev/") || input === "https://example.pages.dev/") {
        return Promise.resolve({
          status: 200,
          headers: { get: () => "text/html" },
          text: () => Promise.resolve(html),
        });
      }
      if (input.includes("/_app/immutable/")) {
        return Promise.resolve({
          status: 200,
          headers: { get: () => "text/javascript; charset=utf-8" },
          text: () => Promise.resolve("export {}"),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${input}`));
    };

    await expect(
      smokeImmutableAssets({
        baseUrl: "https://example.pages.dev",
        paths: ["/"],
        fetchImpl,
      }),
    ).resolves.toEqual([]);
  });
});
