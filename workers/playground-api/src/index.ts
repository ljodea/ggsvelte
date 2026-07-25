/**
 * Cloudflare Worker entry — playground generate API.
 */

import { errorCorsHeaders } from "./cors";
import { apiError, SAFE_MESSAGES, statusForError } from "./errors";
import { handleGenerate, type PlaygroundApiEnv } from "./handler";

export interface Env extends PlaygroundApiEnv {}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/v1/generate" || url.pathname === "/v1/generate/") {
      return handleGenerate(request, env);
    }
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(JSON.stringify({ ok: true, service: "ggsvelte-playground-api" }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", Vary: "Origin" },
      });
    }
    // One taxonomy: the 404 body comes from apiError() with a code whose
    // canonical status is 404, and it echoes the origin so a misrouted client
    // reads `not_found` instead of an opaque CORS failure (#697).
    return new Response(JSON.stringify(apiError("not_found", SAFE_MESSAGES.not_found)), {
      status: statusForError("not_found"),
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...errorCorsHeaders(request.headers.get("Origin")),
      },
    });
  },
};
