import { describe, expect, test } from "bun:test";

import { matchCorsOrigin } from "../src/cors";
import { DEFAULT_MODELS, handleGenerate, sanitizeForLeak } from "../src/handler";
import {
  assembleSystemPrompt,
  buildChatMessages,
  formatRepairUserMessage,
  SYSTEM_PROMPT_MAX_BYTES,
  totalMessageTokens,
} from "../src/prompt";

const okLimiters = {
  RATE_LIMIT_IP: { limit: () => Promise.resolve({ success: true }) },
  RATE_LIMIT_GLOBAL: { limit: () => Promise.resolve({ success: true }) },
};

function request(body: unknown, init: { origin?: string | null; method?: string } = {}): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init.origin !== null && init.origin !== undefined) {
    headers.set("Origin", init.origin);
  } else if (init.origin !== null) {
    headers.set("Origin", "https://ggsvelte.sh");
  }
  return new Request("https://playground-api.ggsvelte.sh/v1/generate", {
    method: init.method ?? "POST",
    headers,
    body: init.method === "OPTIONS" ? null : JSON.stringify(body),
  });
}

describe("cors allowlist", () => {
  test("allows production, pages, localhost, and preview subdomains", () => {
    expect(matchCorsOrigin("https://ggsvelte.sh")).toBe("https://ggsvelte.sh");
    expect(matchCorsOrigin("https://ggsvelte.pages.dev")).toBe("https://ggsvelte.pages.dev");
    expect(matchCorsOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(matchCorsOrigin("https://abc123.ggsvelte.pages.dev")).toBe(
      "https://abc123.ggsvelte.pages.dev",
    );
    expect(matchCorsOrigin("https://evil.example")).toBeNull();
  });
});

describe("system prompt", () => {
  test("stays under byte budget for every dataset", () => {
    for (const id of ["penguins", "monthly", "categories"] as const) {
      const prompt = assembleSystemPrompt(id);
      expect(new TextEncoder().encode(prompt).byteLength).toBeLessThanOrEqual(
        SYSTEM_PROMPT_MAX_BYTES,
      );
      expect(prompt).toContain(`{"name":`);
      expect(prompt).toContain(id);
      expect(prompt).not.toContain("createPlotInteraction");
    }
  });

  test("includes currentSpec refinement context", () => {
    const { messages } = buildChatMessages({
      datasetId: "penguins",
      prompt: "make points larger",
      currentSpec: { edition: 2, data: { name: "penguins" }, layers: [] },
    });
    expect(messages.some((m) => m.content.includes("Current chart spec"))).toBe(true);
  });

  test("repair message preserves raw SpecError allowed + fix.example", () => {
    const errors = [
      {
        code: "unknown-field",
        path: "/layers/0/aes/x",
        message: "Unknown field",
        allowed: ["flipper", "mass"],
        fix: { description: "use flipper", example: { field: "flipper" } },
      },
    ];
    const msg = formatRepairUserMessage(errors);
    expect(msg).toContain("allowed");
    expect(msg).toContain("fix");
    expect(msg).toContain("flipper");
    expect(msg.toLowerCase()).toContain("corrected complete envelope");
  });
});

describe("handleGenerate", () => {
  test("OPTIONS preflight echoes matched origin", async () => {
    const res = await handleGenerate(
      request({}, { method: "OPTIONS", origin: "https://ggsvelte.sh" }),
      {},
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://ggsvelte.sh");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  test("rejects forbidden origin", async () => {
    const res = await handleGenerate(
      request({ prompt: "hi", datasetId: "penguins" }, { origin: "https://evil.example" }),
      { OPENROUTER_API_KEY: "sk-test" },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("origin_forbidden");
  });

  test("prompt too long and unknown dataset", async () => {
    const long = await handleGenerate(request({ prompt: "x".repeat(501), datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test",
      ...okLimiters,
    });
    expect(((await long.json()) as { error: { code: string } }).error.code).toBe("prompt_too_long");

    const unknown = await handleGenerate(request({ prompt: "hi", datasetId: "nope" }), {
      OPENROUTER_API_KEY: "sk-test",
      ...okLimiters,
    });
    expect(((await unknown.json()) as { error: { code: string } }).error.code).toBe(
      "unknown_dataset",
    );
  });

  test("disabled kill-switch and missing key", async () => {
    const disabled = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      DISABLED: "true",
      OPENROUTER_API_KEY: "sk-test",
      ...okLimiters,
    });
    expect(disabled.status).toBe(503);
    expect(((await disabled.json()) as { error: { code: string } }).error.code).toBe("disabled");

    const noKey = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {});
    expect(noKey.status).toBe(503);
  });

  test("rate limit returns 429 with retryAfterSeconds", async () => {
    const res = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test",
      RATE_LIMIT_IP: {
        limit: () => Promise.resolve({ success: false }),
      },
      RATE_LIMIT_GLOBAL: okLimiters.RATE_LIMIT_GLOBAL,
    });
    expect(res.status).toBe(429);
    const body = (await res.json()) as {
      error: { code: string; retryAfterSeconds?: number };
    };
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.retryAfterSeconds).toBe(60);
  });

  test("maps upstream 429 and errors; never leaks secrets", async () => {
    const logs: Record<string, unknown>[] = [];
    const rate = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-live-secret-key-material",
      ...okLimiters,
      log: (line) => {
        logs.push(line);
      },
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Bearer sk-live-secret" } }), {
            status: 429,
          }),
        ),
    });
    const rateText = await rate.text();
    expect(rate.status).toBe(429);
    expect(rateText).not.toContain("sk-live-secret");
    expect(rateText).not.toContain("Authorization");
    expect(sanitizeForLeak(rateText)).toBe(true);

    const bad = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-live-secret-key-material",
      ...okLimiters,
      log: (line) => {
        logs.push(line);
      },
      fetch: () =>
        Promise.resolve(
          new Response("not-json", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    });
    const badBody = (await bad.json()) as { error: { code: string } };
    expect(badBody.error.code).toBe("bad_output");

    for (const line of logs) {
      const serialized = JSON.stringify(line);
      expect(serialized).not.toContain("hi");
      expect(serialized).not.toContain("sk-live");
      expect(line).toHaveProperty("outcome");
      expect(line).toHaveProperty("repair_used");
    }
  });

  test("happy path returns envelope JSON object", async () => {
    const envelope = {
      spec: { edition: 2, data: { name: "penguins" }, layers: [{ geom: "point" }] },
      interactions: { inspect: true },
      title: "T",
    };
    const res = await handleGenerate(request({ prompt: "scatter", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test-key",
      ...okLimiters,
      fetch: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              model: "test/model",
              choices: [{ message: { content: JSON.stringify(envelope) } }],
            }),
            { status: 200 },
          ),
        ),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      model: string;
      envelope: unknown;
    };
    expect(body.ok).toBe(true);
    expect(body.model).toBe("test/model");
    expect(body.envelope).toEqual(envelope);
  });

  test("refuses oversized priorSpec before calling OpenRouter", async () => {
    let called = false;
    const huge = "x".repeat(9 * 1024);
    const res = await handleGenerate(
      request({
        prompt: "fix",
        datasetId: "penguins",
        priorSpec: { pad: huge },
        priorErrors: [{ code: "x", path: "/", message: "m" }],
      }),
      {
        OPENROUTER_API_KEY: "sk-test",
        ...okLimiters,
        fetch: () => {
          called = true;
          return Promise.resolve(new Response("{}", { status: 200 }));
        },
      },
    );
    expect(called).toBe(false);
    expect(res.status).toBe(400);
  });

  test("token budget stays sane for a plain prompt", () => {
    const { messages } = buildChatMessages({
      datasetId: "penguins",
      prompt: "hello",
    });
    expect(totalMessageTokens(messages)).toBeLessThan(6000);
  });

  test("rejects requests whose assembled messages exceed MAX_INPUT_TOKENS", async () => {
    let called = false;
    const big = "x".repeat(7 * 1024);
    const res = await handleGenerate(
      request({
        prompt: "fix",
        datasetId: "penguins",
        currentSpec: { pad: big },
        priorSpec: { pad: big },
        priorErrors: [
          { code: "x", path: "/", message: "m".repeat(4000) },
          { code: "y", path: "/", message: "m".repeat(4000) },
        ],
      }),
      {
        OPENROUTER_API_KEY: "sk-test",
        ...okLimiters,
        fetch: () => {
          called = true;
          return Promise.resolve(new Response("{}", { status: 200 }));
        },
      },
    );
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });

  test("fails closed when the key is set but a limiter binding is missing", async () => {
    let called = false;
    const res = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test",
      RATE_LIMIT_IP: okLimiters.RATE_LIMIT_IP,
      // RATE_LIMIT_GLOBAL deliberately missing.
      fetch: () => {
        called = true;
        return Promise.resolve(new Response("{}", { status: 200 }));
      },
    });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("disabled");
    expect(called).toBe(false);
  });

  test("global limiter exhaustion returns 429", async () => {
    const res = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test",
      RATE_LIMIT_IP: okLimiters.RATE_LIMIT_IP,
      RATE_LIMIT_GLOBAL: { limit: () => Promise.resolve({ success: false }) },
    });
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("rate_limited");
  });

  test("origin-less requests (curl, eval tooling) are deliberately allowed", async () => {
    // No Origin header: proceeds past CORS to the no-key disabled path.
    const res = await handleGenerate(
      request({ prompt: "hi", datasetId: "penguins" }, { origin: null }),
      {},
    );
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("disabled");
  });

  test("oversized Content-Length is refused before parsing", async () => {
    const headers = new Headers({
      "Content-Type": "application/json",
      "Content-Length": String(1024 * 1024),
      Origin: "https://ggsvelte.sh",
    });
    const req = new Request("https://playground-api.ggsvelte.sh/v1/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: "hi", datasetId: "penguins" }),
    });
    const res = await handleGenerate(req, { OPENROUTER_API_KEY: "sk-test", ...okLimiters });
    expect(res.status).toBe(400);
  });

  test("unsupported methods return 405 with Allow", async () => {
    const res = await handleGenerate(
      request({ prompt: "hi", datasetId: "penguins" }, { method: "PUT" }),
      {},
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  // The outbound call is the only place money is spent. Without these
  // assertions the allowlist, token ceiling, and JSON mode could all be
  // dropped — or swapped to a paid model — with every other test still green.
  test("outbound request pins the cost-control surface", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    await handleGenerate(request({ prompt: "scatter", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test-key",
      ...okLimiters,
      fetch: (url, init) => {
        seenUrl = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
        seenBody = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<
          string,
          unknown
        >;
        return Promise.resolve(
          new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "{}" } }] }), {
            status: 200,
          }),
        );
      },
    });
    expect(seenUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(seenBody["models"]).toEqual([...DEFAULT_MODELS]);
    expect(seenBody["max_tokens"]).toBe(2000);
    expect(seenBody["response_format"]).toEqual({ type: "json_object" });
  });

  test("MODEL_ALLOWLIST overrides the default model list", async () => {
    let seenBody: Record<string, unknown> = {};
    await handleGenerate(request({ prompt: "scatter", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-test-key",
      MODEL_ALLOWLIST: "vendor/free-a, vendor/free-b",
      ...okLimiters,
      fetch: (_url, init) => {
        seenBody = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<
          string,
          unknown
        >;
        return Promise.resolve(
          new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "{}" } }] }), {
            status: 200,
          }),
        );
      },
    });
    expect(seenBody["models"]).toEqual(["vendor/free-a", "vendor/free-b"]);
  });

  // Both limiters keyed the same way would collapse every visitor into one
  // bucket (or give each visitor their own global budget).
  test("limiters are keyed per-IP and globally", async () => {
    const keys: Record<string, string> = {};
    const req = new Request("https://playground-api.ggsvelte.sh/v1/generate", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        Origin: "https://ggsvelte.sh",
        "CF-Connecting-IP": "203.0.113.7",
      }),
      body: JSON.stringify({ prompt: "hi", datasetId: "penguins" }),
    });
    await handleGenerate(req, {
      OPENROUTER_API_KEY: "sk-test",
      RATE_LIMIT_IP: {
        limit: (o: { key: string }) => {
          keys["ip"] = o.key;
          return Promise.resolve({ success: true });
        },
      },
      RATE_LIMIT_GLOBAL: {
        limit: (o: { key: string }) => {
          keys["global"] = o.key;
          return Promise.resolve({ success: true });
        },
      },
      fetch: () => Promise.resolve(new Response("{}", { status: 200 })),
    });
    expect(keys["ip"]).toBe("203.0.113.7");
    expect(keys["global"]).toBe("global");
  });

  test("oversized body is refused even without a Content-Length header", async () => {
    let called = false;
    // No Content-Length: the header pre-filter cannot fire, so the ceiling has
    // to be enforced on the bytes actually read.
    const body = JSON.stringify({
      prompt: "hi",
      datasetId: "penguins",
      pad: "x".repeat(80 * 1024),
    });
    const req = new Request("https://playground-api.ggsvelte.sh/v1/generate", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json", Origin: "https://ggsvelte.sh" }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body));
          controller.close();
        },
      }),
      // @ts-expect-error duplex is required for a streaming request body.
      duplex: "half",
    });
    const res = await handleGenerate(req, {
      OPENROUTER_API_KEY: "sk-test",
      ...okLimiters,
      fetch: () => {
        called = true;
        return Promise.resolve(new Response("{}", { status: 200 }));
      },
    });
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });

  test("adversarially large priorErrors are refused before assembling messages", async () => {
    let called = false;
    const res = await handleGenerate(
      request({
        prompt: "fix",
        datasetId: "penguins",
        priorSpec: { ok: true },
        priorErrors: [{ code: "x", path: "/", message: "m".repeat(9 * 1024) }],
      }),
      {
        OPENROUTER_API_KEY: "sk-test",
        ...okLimiters,
        fetch: () => {
          called = true;
          return Promise.resolve(new Response("{}", { status: 200 }));
        },
      },
    );
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });
});
