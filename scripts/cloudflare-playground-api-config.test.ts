import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Config-contract for workers/playground-api/wrangler.toml.
 *
 * handleGenerate fails closed when OPENROUTER_API_KEY is set but a rate-limit
 * binding is missing (503 disabled). A typo in either the toml binding names
 * or PlaygroundApiEnv therefore 503s 100% of production traffic while the
 * handler unit suite stays green — same failure mode as the Pages config
 * contract in cloudflare-pages-config.test.ts (#698).
 */

const ROOT = join(import.meta.dir, "..");
const TOML = readFileSync(join(ROOT, "workers", "playground-api", "wrangler.toml"), "utf8");
const HANDLER = readFileSync(join(ROOT, "workers", "playground-api", "src", "handler.ts"), "utf8");

function bindingNames(toml: string): string[] {
  const names: string[] = [];
  for (const match of toml.matchAll(/^\s*name\s*=\s*"([^"]+)"/gmu)) {
    const name = match[1];
    if (name !== undefined) names.push(name);
  }
  return names;
}

describe("Cloudflare playground-api wrangler contract", () => {
  it("names the worker and pins the entry module", () => {
    expect(TOML).toMatch(/^\s*name\s*=\s*"ggsvelte-playground-api"/mu);
    expect(TOML).toMatch(/^\s*main\s*=\s*"src\/index\.ts"/mu);
    expect(TOML).toMatch(/^\s*compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/mu);
  });

  it("declares the rate-limit bindings the handler fails closed without", () => {
    const names = bindingNames(TOML);
    expect(names).toContain("RATE_LIMIT_IP");
    expect(names).toContain("RATE_LIMIT_GLOBAL");
    expect(TOML).toMatch(/\[\[unsafe\.bindings\]\][\s\S]*type\s*=\s*"ratelimit"/u);
  });

  it("keeps PlaygroundApiEnv field names aligned with wrangler bindings and vars", () => {
    // Interface is the TypeScript contract; toml is the deploy contract.
    expect(HANDLER).toMatch(/readonly OPENROUTER_API_KEY\?: string/u);
    expect(HANDLER).toMatch(/readonly MODEL_ALLOWLIST\?: string/u);
    expect(HANDLER).toMatch(/readonly DISABLED\?: string/u);
    expect(HANDLER).toMatch(/readonly RATE_LIMIT_IP\?: RateLimitBinding/u);
    expect(HANDLER).toMatch(/readonly RATE_LIMIT_GLOBAL\?: RateLimitBinding/u);

    expect(TOML).toMatch(/MODEL_ALLOWLIST\s*=/u);
    expect(TOML).toMatch(/DISABLED\s*=/u);
    // Secret is set at deploy time, not in committed vars.
    expect(TOML).toContain("wrangler secret put OPENROUTER_API_KEY");
    expect(TOML).not.toMatch(/^\s*OPENROUTER_API_KEY\s*=/mu);
  });

  it("pins free-tier allowlist defaults that match DEFAULT_MODELS", () => {
    // A silent drift here would send paid traffic or an empty models list.
    expect(HANDLER).toContain("google/gemini-2.0-flash-exp:free");
    expect(HANDLER).toContain("meta-llama/llama-3.3-70b-instruct:free");
    expect(TOML).toContain("google/gemini-2.0-flash-exp:free");
    expect(TOML).toContain("meta-llama/llama-3.3-70b-instruct:free");
  });
});
