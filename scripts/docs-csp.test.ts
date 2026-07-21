import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { docsCspDirectives } from "../apps/docs/csp";
import { validateDocsCsp, validateHtmlCsp } from "./docs-csp";

describe("docs CSP validation", () => {
  it("upgrades insecure requests only for HTTPS publication modes", () => {
    expect(docsCspDirectives("dev")).not.toHaveProperty("upgrade-insecure-requests");
    for (const mode of [
      "legacy-full",
      "cloudflare-preview",
      "cloudflare-production",
      "legacy-migration",
    ] as const) {
      expect(docsCspDirectives(mode)).toHaveProperty("upgrade-insecure-requests", true);
    }
  });

  it("keeps visual determinism compatible with enforced style-element CSP", () => {
    const helper = readFileSync(
      join(import.meta.dir, "..", "tests", "visual", "helpers", "deterministic.ts"),
      "utf8",
    );
    const css = readFileSync(join(import.meta.dir, "..", "apps", "docs", "src", "app.css"), "utf8");

    expect(helper).not.toContain("addStyleTag");
    expect(helper).toContain("dataset.visualTest");
    expect(css).toContain("html[data-visual-test]");
  });

  it("requires each executable inline script to have an exact CSP hash", () => {
    const script = "window.ok = true;";
    const allowed = `<html><head><meta http-equiv="content-security-policy" content="script-src 'self' 'sha256-brEJFbdwhNtD+3GNEqieG8EUDl5O3uwckNR5MnkJ/Pk='; style-src 'self'; style-src-attr 'unsafe-inline'"></head><body><script>${script}</script></body></html>`;
    const blocked = allowed.replace("brEJFbdwhNtD+3GNEqieG8EUDl5O3uwckNR5MnkJ/Pk=", "invalid");
    const misplaced = allowed.replace(
      "script-src 'self' 'sha256-brEJFbdwhNtD+3GNEqieG8EUDl5O3uwckNR5MnkJ/Pk='; style-src 'self'",
      "script-src 'self'; style-src 'self' 'sha256-brEJFbdwhNtD+3GNEqieG8EUDl5O3uwckNR5MnkJ/Pk='",
    );

    expect(validateHtmlCsp("allowed.html", allowed)).toEqual([]);
    expect(validateHtmlCsp("blocked.html", blocked)).toContain(
      "blocked.html: executable inline script is missing its exact sha256 CSP source",
    );
    expect(validateHtmlCsp("misplaced.html", misplaced)).toContain(
      "misplaced.html: executable inline script is missing its exact sha256 CSP source",
    );
  });

  it("places the CSP meta before every resource element it governs", () => {
    const policy = `<meta http-equiv="content-security-policy" content="script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'">`;

    for (const late of [
      `<script src="/theme.js"></script>${policy}`,
      `<link rel="icon" href="/x.svg">${policy}`,
    ]) {
      expect(validateHtmlCsp("late.html", late)).toContain(
        "late.html: CSP meta must precede every governed resource element",
      );
    }
  });

  it("rejects broad inline script and style-element allowances", () => {
    const html = `<meta http-equiv="content-security-policy" content="script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; style-src-attr 'unsafe-inline'">`;

    expect(validateHtmlCsp("unsafe.html", html)).toEqual([
      "unsafe.html: script-src must not allow unsafe-inline",
      "unsafe.html: style-src must not allow unsafe-inline",
    ]);
  });

  it("requires inline style elements to have exact CSP hashes", () => {
    const style = "body { color: red; }";
    const allowed = `<meta http-equiv="content-security-policy" content="script-src 'self'; style-src 'self' 'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='; style-src-attr 'unsafe-inline'"><style>${style}</style>`;

    expect(validateHtmlCsp("styled.html", allowed)).toEqual([]);
    expect(validateHtmlCsp("styled.html", allowed.replace("XeYlw2NV", "invalid"))).toContain(
      "styled.html: inline style element is missing its exact sha256 CSP source",
    );
  });

  it("allows bounded style attributes but rejects inline event handlers", () => {
    const policy = `<meta http-equiv="content-security-policy" content="script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'unsafe-inline'">`;

    expect(validateHtmlCsp("attributes.html", `${policy}<div style="--x: 1"></div>`)).toEqual([]);
    expect(
      validateHtmlCsp("attributes.html", `${policy}<button onclick="alert(1)">x</button>`),
    ).toContain("attributes.html: inline event handler is forbidden");
    expect(
      validateHtmlCsp(
        "attributes.html",
        `${policy.replace("style-src-attr 'unsafe-inline'", "style-src-attr 'none'")}<div style="--x: 1"></div>`,
      ),
    ).toContain("attributes.html: style attributes require the bounded style-src-attr allowance");
  });

  it("requires an enforced frame-ancestor header and validates every built HTML document", () => {
    const directory = mkdtempSync(join(tmpdir(), "ggsvelte-csp-"));
    writeFileSync(
      join(directory, "_headers"),
      "/*\n  Content-Security-Policy: frame-ancestors 'none'\n",
    );
    const policy =
      "default-src 'self'; base-uri 'self'; connect-src 'self' https://cloudflareinsights.com; font-src 'self'; form-action 'self'; frame-src 'none'; img-src 'self' data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self' https://static.cloudflareinsights.com; script-src-attr 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; upgrade-insecure-requests";
    writeFileSync(
      join(directory, "index.html"),
      `<meta http-equiv="content-security-policy" content="${policy}">`,
    );

    expect(validateDocsCsp(directory)).toEqual([]);

    writeFileSync(
      join(directory, "index.html"),
      `<meta http-equiv="content-security-policy" content="${policy.replace("object-src 'none'; ", "")}">`,
    );
    expect(validateDocsCsp(directory)).toContain("index.html: object-src must include 'none'");

    writeFileSync(
      join(directory, "_headers"),
      "/*\n  Content-Security-Policy-Report-Only: frame-ancestors 'none'\n",
    );
    expect(validateDocsCsp(directory)).toContain(
      "_headers: missing enforced frame-ancestors 'none' policy",
    );
  });
});
