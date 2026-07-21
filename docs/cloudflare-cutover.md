# Cloudflare Pages cutover runbook

This runbook moves the public documentation from GitHub Pages to `https://ggsvelte.sh` without using DNS churn as rollback. GitHub Pages remains a path-preserving migration and benchmark host for at least 12 months.

## Repository-owned contract

`apps/docs/deployment/cloudflare-pages.json` is the checked deployment contract:

- Git-integrated Pages project `ggsvelte`
- production branch `main`
- repository-root build command `bun run build:cloudflare`
- output directory `apps/docs/build`
- Build system v3 with Bun 1.3.14 and Node.js 22
- `cloudflare-production` on `main`; `cloudflare-preview` on other branches
- conservative build-watch paths covering every package, docs, example, generator, lockfile, and TypeScript input

The build emits `artifact.json`, `_headers`, `_redirects`, `404.html`, canonical metadata, sitemap, robots, and text discovery endpoints. `artifact.json` binds the artifact to its source commit, route-inventory digest, and build mode. Cloudflare artifacts never fetch or contain mutable benchmark history; `/bench/*` temporarily redirects to the preserved legacy subtree.

## Stop gates

Stop without changing DNS or redirects if any gate fails:

1. A Git-integrated preview did not build from the intended commit.
2. Preview smoke failed, including the `X-Robots-Tag: noindex` check.
3. The production `pages.dev` artifact does not report the merged source commit.
4. The apex custom domain or certificate is not `Active`.
5. Apex smoke fails on a core route, deep link, schema, discovery file, headers, 404, or redirect.
6. The exact-host redirect would affect branch/hash preview hosts.
7. The old-host migration artifact cannot preserve its benchmark subtree.

## Before mutation

Capture a private timestamped snapshot. Do not commit account IDs, record IDs, credentials, Access policy details, or certificate material.

- DNS records, including CAA
- SSL/TLS mode, edge certificates, and minimum TLS settings
- zone and account redirect/ruleset configuration
- cache rules
- Workers routes
- Access applications/policies
- current Pages projects, domains, deployments, and production aliases
- current GitHub Pages source/status
- public A, AAAA, CNAME, CAA, and NS answers

Freeze route evidence with:

```sh
bun run legacy:routes:check
```

`apps/docs/deployment/precutover-crawl.json` records the successful pre-cutover sitemap crawl. `legacy-routes.json` combines canonical routes, aliases, sitemap entries, and live-crawl paths. `/bench` is an explicit preserve-in-place exception.

## Preview gate

Create the Pages project through Cloudflare's Git integration, not Direct Upload. Apply the checked project contract and ensure previews are enabled for pull-request branches.

Run:

```sh
bun run smoke:deployment -- \
  --phase preview \
  --base-url https://<immutable-preview>.ggsvelte.pages.dev \
  --source-commit <40-character-commit>
```

The immutable preview must return the intended `artifact.json`, root/deep routes, schema, `llms.txt`, sitemap, robots, and a real 404. Every preview response must carry `X-Robots-Tag: noindex`. Preview hosts must not redirect to production and must not contain the analytics beacon.

## Production and apex activation

1. Merge only after the immutable preview and current-head review/CI gates pass.
2. Wait for the `main` Pages deployment and record its deployment ID as the first known-good production deployment.
3. Verify `https://ggsvelte.pages.dev/artifact.json` reports the merged source commit and `cloudflare-production`.
4. Attach `ggsvelte.sh` through Pages Custom Domains.
5. Wait until Cloudflare reports the domain and certificate as `Active`.
6. Smoke apex from fresh requests before changing `www`, `pages.dev`, or GitHub Pages.
7. Attach `www.ggsvelte.sh`, then add a permanent path-and-query-preserving redirect to the apex.
8. Redirect only the exact production host `ggsvelte.pages.dev` to the apex. Do not match hash or branch preview subdomains.
9. Keep `_redirects` handling `/ggsvelte/*` cleanup and temporary external `/bench/*` redirects.

Run the full matrix:

```sh
bun run smoke:deployment -- \
  --phase cutover \
  --apex-origin https://ggsvelte.sh \
  --www-origin https://www.ggsvelte.sh \
  --production-pages-origin https://ggsvelte.pages.dev \
  --legacy-origin https://ljodea.github.io/ggsvelte \
  --source-commit <merged-commit>
```

## Analytics boundary

Cloudflare Web Analytics is optional and dashboard-created. Put its public 32-character beacon token only in the production `DOCS_ANALYTICS_TOKEN` environment variable. Preview and legacy environments must not receive it.

The site uses only Cloudflare's standard page-navigation and Core Web Vitals collection. Do not add custom events, chart/spec/search/filter data, query strings, fragments, cookies, fingerprints, or stable user identifiers. Do not describe route traffic as installs or conversions.

## Legacy migration activation

Only after apex and redirect smoke pass:

```sh
gh variable set DOCS_LEGACY_MODE --repo ljodea/ggsvelte --body legacy-migration
gh workflow run pages.yml --repo ljodea/ggsvelte
```

The workflow rebuilds with `BASE_PATH=/ggsvelte`, keeps the benchmark subtree from `gh-pages`, replaces every frozen known HTML route with a fixed-origin migration page, and writes a migration 404 for unknown paths. JavaScript preserves query and fragment state with `location.replace`; the visible absolute link and meta refresh remain the no-JavaScript fallback. The legacy `artifact.json` records the source commit, frozen-route digest, benchmark commit, and benchmark-byte digest.

Do not delete GitHub Pages, the `gh-pages` branch, or benchmark history during this cutover.

## Rollback

For an application regression, roll Pages production back to the recorded known-good deployment and rerun the smoke matrix. Do not edit nameservers or repeatedly remove/re-add the custom domain.

If initial apex activation fails before a known-good Pages deployment exists, stop redirect and migration work; the unchanged GitHub Pages site remains the public fallback. If the legacy migration fails, leave its previous deployment live and do not retry with a partial artifact.

## Monitoring

First five minutes: deployment status, root/deep routes, assets, headers, 404, sitemap, schema, `llms`, benchmark redirect, and certificate.

First hour: redirect path/query preservation, CSP report-only signals, cache headers, 404s, and Core Web Vitals.

First 24–48 hours: deployment errors, old-host traffic, sitemap fetches, Search Console/Bing crawl diagnostics, index coverage, and rollback readiness. Sitemap submission is not evidence of indexing or ranking; follow `docs/search-verification.md`.

Review old-host traffic and maintenance cost after at least 12 months before changing the migration guarantee.
