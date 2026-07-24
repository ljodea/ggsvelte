/**
 * Cloudflare Worker entry — playground generate API.
 */

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
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    return new Response(
      JSON.stringify({ ok: false, error: { code: "bad_request", message: "Not found." } }),
      {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  },
};
