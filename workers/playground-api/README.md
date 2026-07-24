# ggsvelte playground API

Cloudflare Worker that proxies free-tier OpenRouter models for the docs
playground (`POST /v1/generate`). The docs site is static; this worker is the
only server-side piece.

## Status

**Not auto-deployed.** Ship worker code + tests in-repo; a maintainer deploys
when ready. Live generation stays off for visitors until:

1. A dedicated OpenRouter account with a **$1 spend cap** is provisioned.
2. Free-model ids are chosen via the Phase-0 eval (see below).
3. `wrangler secret put OPENROUTER_API_KEY` and `wrangler deploy` succeed.
4. DNS for `playground-api.ggsvelte.sh` points at the worker.

Until then the docs client defaults to `VITE_PLAYGROUND_API_MODE=mock` and
example prompts use **pre-validated canned envelopes** (no network).

## Phase-0 eval gate (required before enabling live generation)

```bash
# Requires OPENROUTER_API_KEY — do NOT run in CI without a secret.
bun workers/playground-api/eval/run-eval.ts
```

**Gate: ≥70% valid-envelope rate** after one repair round across the prompt
corpus. Below that threshold, keep generation disabled and rely on samples +
canned examples.

The eval script is committed; maintainers run it when a key exists. Canned
example envelopes under `apps/docs/src/lib/playground-prompts.ts` are
hand-authored and validated at test time with `validate()` from `@ggsvelte/spec`.

## Local dev

```bash
# Optional: run the worker locally (needs OPENROUTER_API_KEY for real calls)
cd workers/playground-api
bunx wrangler dev

# Docs client mock mode (default) — never needs the worker
VITE_PLAYGROUND_API_MODE=mock bun --cwd apps/docs dev
```

## Deploy (maintainer)

```bash
cd workers/playground-api
wrangler secret put OPENROUTER_API_KEY
# Optionally set MODEL_ALLOWLIST / DISABLED via wrangler.toml [vars] or dashboard
wrangler deploy
```

Enable rate-limit bindings in `wrangler.toml` when the Cloudflare rate-limiting
product is available. They shape traffic only — the spend cap is the real
availability backstop (exhaustion pauses generation for everyone until reset).

## API

`POST /v1/generate`

Request:

```json
{
  "prompt": "string ≤500 chars",
  "datasetId": "penguins" | "monthly" | "categories",
  "currentSpec": { },
  "priorSpec": { },
  "priorErrors": [ /* raw SpecError[] from validate() */ ]
}
```

Response:

```json
{
  "ok": true,
  "model": "…",
  "envelope": { "spec": {}, "interactions": {}, "title": "…" }
}
```

or

```json
{
  "ok": false,
  "error": { "code": "rate_limited", "message": "…", "retryAfterSeconds": 60 }
}
```

Error codes: `bad_request | prompt_too_long | unknown_dataset | origin_forbidden |
rate_limited | upstream_rate_limited | upstream_error | bad_output | disabled`.

Semantic validation is **client-side**. The worker only checks that the model
returned a JSON object.

## Logging

Count-only structured lines (no prompts, IPs, or user content):

```json
{
  "model": "…",
  "outcome": "ok|bad_output|rate_limited|upstream_error|…",
  "repair_used": false,
  "duration": 1234
}
```

View via `wrangler tail` / Cloudflare dashboard. Use outcomes to tune `MODEL_ALLOWLIST`.

## SKILL.md drift

Prompt assembly lives in `src/prompt.ts` (playground-specific, not a verbatim
SKILL.md paste). Editing `skills/ggsvelte/SKILL.md` does **not** auto-redeploy
this worker — acceptable v1 staleness; redeploy after intentional prompt changes.
