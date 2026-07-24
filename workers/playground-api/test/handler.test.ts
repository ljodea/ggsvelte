import { describe, expect, test } from "bun:test";

import { matchCorsOrigin } from "../src/cors";
import { handleGenerate, sanitizeForLeak } from "../src/handler";
import {
  assembleSystemPrompt,
  buildChatMessages,
  formatRepairUserMessage,
  SYSTEM_PROMPT_MAX_BYTES,
  totalMessageTokens,
} from "../src/prompt";

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
    });
    expect(((await long.json()) as { error: { code: string } }).error.code).toBe("prompt_too_long");

    const unknown = await handleGenerate(request({ prompt: "hi", datasetId: "nope" }), {
      OPENROUTER_API_KEY: "sk-test",
    });
    expect(((await unknown.json()) as { error: { code: string } }).error.code).toBe(
      "unknown_dataset",
    );
  });

  test("disabled kill-switch and missing key", async () => {
    const disabled = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      DISABLED: "true",
      OPENROUTER_API_KEY: "sk-test",
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
        limit: async () => ({ success: false }),
      },
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
      log: (line) => logs.push(line),
      fetch: async () =>
        new Response(JSON.stringify({ error: { message: "Bearer sk-live-secret" } }), {
          status: 429,
        }),
    });
    const rateText = await rate.text();
    expect(rate.status).toBe(429);
    expect(rateText).not.toContain("sk-live-secret");
    expect(rateText).not.toContain("Authorization");
    expect(sanitizeForLeak(rateText)).toBe(true);

    const bad = await handleGenerate(request({ prompt: "hi", datasetId: "penguins" }), {
      OPENROUTER_API_KEY: "sk-live-secret-key-material",
      log: (line) => logs.push(line),
      fetch: async () =>
        new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
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
      fetch: async () =>
        new Response(
          JSON.stringify({
            model: "test/model",
            choices: [{ message: { content: JSON.stringify(envelope) } }],
          }),
          { status: 200 },
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
        fetch: async () => {
          called = true;
          return new Response("{}", { status: 200 });
        },
      },
    );
    expect(called).toBe(false);
    expect(res.status).toBe(400);
  });

  test("token budget is enforced on assembled messages", () => {
    const { messages } = buildChatMessages({
      datasetId: "penguins",
      prompt: "hello",
    });
    expect(totalMessageTokens(messages)).toBeLessThan(6000);
  });
});
