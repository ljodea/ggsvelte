import type { DocsBuildConfig } from "./build-mode";

const PLAYGROUND_API_ORIGIN = "https://playground-api.ggsvelte.sh";
const PLAYGROUND_API_DEV_ORIGIN = "http://localhost:8787";

export function docsCspDirectives(mode: DocsBuildConfig["mode"]) {
  const connectSrc =
    mode === "dev"
      ? ([
          "self",
          "https://cloudflareinsights.com",
          PLAYGROUND_API_ORIGIN,
          PLAYGROUND_API_DEV_ORIGIN,
        ] as const)
      : (["self", "https://cloudflareinsights.com", PLAYGROUND_API_ORIGIN] as const);

  return {
    "default-src": ["self"],
    "base-uri": ["self"],
    "connect-src": connectSrc,
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
