import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return match?.[1] ?? match?.[2] ?? null;
}

function cspMeta(html: string): { policy: string; index: number } | null {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "http-equiv")?.toLowerCase() === "content-security-policy") {
      const policy = attribute(tag, "content");
      if (policy !== null) return { policy, index: match.index };
    }
  }
  return null;
}

function cspPolicy(html: string): string | null {
  return cspMeta(html)?.policy ?? null;
}

function sha256Source(content: string): string {
  return `'sha256-${createHash("sha256").update(content).digest("base64")}'`;
}

function directives(policy: string): Map<string, Set<string>> {
  return new Map(
    policy
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter((parts) => parts[0] !== "")
      .map(([name = "", ...sources]) => [name.toLowerCase(), new Set(sources)]),
  );
}

export function validateHtmlCsp(path: string, html: string): string[] {
  const meta = cspMeta(html);
  if (meta === null) return [`${path}: missing enforced content-security-policy meta tag`];

  const { policy } = meta;
  const problems: string[] = [];
  const firstGovernedElement = html.search(
    /<(?:audio|base|embed|form|iframe|img|link|object|script|source|style|video)\b/i,
  );
  if (firstGovernedElement !== -1 && meta.index > firstGovernedElement) {
    problems.push(`${path}: CSP meta must precede every governed resource element`);
  }
  const parsed = directives(policy);
  for (const directive of ["script-src", "style-src"] as const) {
    if (parsed.get(directive)?.has("'unsafe-inline'") === true) {
      problems.push(`${path}: ${directive} must not allow unsafe-inline`);
    }
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1] ?? "";
    const content = match[2] ?? "";
    if (attribute(attributes, "src") !== null) continue;
    if (attribute(attributes, "type")?.toLowerCase() === "application/ld+json") continue;
    if (parsed.get("script-src")?.has(sha256Source(content)) !== true) {
      problems.push(`${path}: executable inline script is missing its exact sha256 CSP source`);
    }
  }
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const content = match[1] ?? "";
    if (parsed.get("style-src")?.has(sha256Source(content)) !== true) {
      problems.push(`${path}: inline style element is missing its exact sha256 CSP source`);
    }
  }
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) {
    problems.push(`${path}: inline event handler is forbidden`);
  }
  if (
    /<[a-z][^>]*\sstyle\s*=/i.test(html) &&
    parsed.get("style-src-attr")?.has("'unsafe-inline'") !== true
  ) {
    problems.push(`${path}: style attributes require the bounded style-src-attr allowance`);
  }
  return problems;
}

const PAGE_DIRECTIVES = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "connect-src": ["'self'", "https://cloudflareinsights.com"],
  "font-src": ["'self'"],
  "form-action": ["'self'"],
  "frame-src": ["'none'"],
  "img-src": ["'self'", "data:"],
  "manifest-src": ["'self'"],
  "media-src": ["'self'"],
  "object-src": ["'none'"],
  "script-src": ["'self'", "https://static.cloudflareinsights.com"],
  "script-src-attr": ["'none'"],
  "style-src": ["'self'"],
  "style-src-attr": ["'unsafe-inline'"],
} as const;

const NOT_FOUND_DIRECTIVES = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-src": ["'none'"],
  "img-src": ["'self'", "data:"],
  "object-src": ["'none'"],
  "script-src": ["'none'"],
  "script-src-attr": ["'none'"],
  "style-src": ["'self'"],
  "style-src-attr": ["'none'"],
} as const;

function validateRequiredDirectives(path: string, html: string): string[] {
  const policy = cspPolicy(html);
  if (policy === null) return [];
  const parsed = directives(policy);
  const required =
    path === "404.html" && parsed.get("script-src")?.has("'none'") === true
      ? NOT_FOUND_DIRECTIVES
      : PAGE_DIRECTIVES;
  const problems: string[] = [];
  for (const [directive, sources] of Object.entries(required)) {
    for (const source of sources) {
      if (parsed.get(directive)?.has(source) !== true) {
        problems.push(`${path}: ${directive} must include ${source}`);
      }
    }
  }
  if (!parsed.has("upgrade-insecure-requests")) {
    problems.push(`${path}: missing upgrade-insecure-requests`);
  }
  return problems;
}

function htmlFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? htmlFiles(path) : [path];
    })
    .filter((path) => path.endsWith(".html"));
}

export function validateDocsCsp(directory: string): string[] {
  const problems: string[] = [];
  const headers = readFileSync(join(directory, "_headers"), "utf8");
  if (!/^\s*Content-Security-Policy:\s*frame-ancestors 'none'\s*$/im.test(headers)) {
    problems.push("_headers: missing enforced frame-ancestors 'none' policy");
  }
  if (/^\s*Content-Security-Policy-Report-Only:/im.test(headers)) {
    problems.push("_headers: report-only CSP must be removed before enforcement");
  }
  for (const path of htmlFiles(directory)) {
    const relativePath = relative(directory, path);
    const html = readFileSync(path, "utf8");
    problems.push(
      ...validateHtmlCsp(relativePath, html),
      ...validateRequiredDirectives(relativePath, html),
    );
  }
  return problems;
}

if (import.meta.main) {
  const directory = process.argv[2] ?? join(import.meta.dir, "..", "apps", "docs", "build");
  const problems = validateDocsCsp(directory);
  if (problems.length > 0) {
    throw new Error(`Docs CSP validation failed:\n- ${problems.join("\n- ")}`);
  }
  console.log("Docs CSP is enforced and all inline executable content is hash-authorized.");
}
