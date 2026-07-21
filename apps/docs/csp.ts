import type { DocsBuildConfig } from "./build-mode";

export function docsCspDirectives(mode: DocsBuildConfig["mode"]) {
  return {
    "default-src": ["self"],
    "base-uri": ["self"],
    "connect-src": ["self", "https://cloudflareinsights.com"],
    "font-src": ["self"],
    "form-action": ["self"],
    "frame-src": ["none"],
    "img-src": ["self", "data:"],
    "manifest-src": ["self"],
    "media-src": ["self"],
    "object-src": ["none"],
    "script-src": ["self", "https://static.cloudflareinsights.com"],
    "script-src-attr": ["none"],
    "style-src": ["self"],
    // Chart layout and palette values are bounded application output, not
    // executable code. Keep this exception scoped to style attributes;
    // inline style elements remain hash-only.
    "style-src-attr": ["unsafe-inline"],
    ...(mode === "dev" ? {} : { "upgrade-insecure-requests": true }),
  } as const;
}
