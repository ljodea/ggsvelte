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

/**
 * Headers for a refused or not-found response (403 origin_forbidden, 404).
 *
 * These bodies carry no data — only a typed error code — so they echo the
 * requesting origin. Without `Access-Control-Allow-Origin` the browser blocks
 * the body, `fetch` rejects with a TypeError, and the client can only report a
 * generic network failure, which made `origin_forbidden` unreachable (#697).
 * Never grants credentials: the allowlist still gates every success response.
 */
export function errorCorsHeaders(origin: string | null): Record<string, string> {
  if (origin === null || origin === "") return { Vary: "Origin" };
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
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
