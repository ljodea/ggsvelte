/**
 * CORS allowlist for the playground generate API.
 * localhost origins ship in production deliberately: the endpoint is public
 * (CORS is UX hygiene, not auth) and local docs dev needs the live worker.
 */

export const CORS_ALLOWLIST = [
  "https://ggsvelte.sh",
  "https://ggsvelte.pages.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
] as const;

/** Preview deployments: https://<hash>.ggsvelte.pages.dev */
const PAGES_PREVIEW = /^https:\/\/[a-z0-9-]+\.ggsvelte\.pages\.dev$/u;

export function matchCorsOrigin(origin: string | null): string | null {
  if (origin === null || origin === "") return null;
  if ((CORS_ALLOWLIST as readonly string[]).includes(origin)) return origin;
  if (PAGES_PREVIEW.test(origin)) return origin;
  return null;
}

// Returns a plain record, not the wider `HeadersInit` union: callers spread
// the result into response-header literals, and `HeadersInit` also admits
// `string[][]`, which would spread to numeric indices.
export function corsHeaders(matchedOrigin: string | null): Record<string, string> {
  if (matchedOrigin === null) {
    return { Vary: "Origin" };
  }
  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
