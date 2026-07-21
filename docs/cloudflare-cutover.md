# Cloudflare Pages cutover runbook

This runbook moves the public documentation from GitHub Pages to `https://ggsvelte.sh` without using DNS churn as rollback. GitHub Pages remains a path-preserving migration and benchmark host for at least 12 months.

## Repository-owned contract

`apps/docs/deployment/cloudflare-pages.json` is the checked deployment contract:

- Direct Upload Pages project `ggsvelte`, deployed by `.github/workflows/cloudflare-pages.yml`
- production branch `main`
- repository-root build command `bun run build:cloudflare`
- output directory `apps/docs/build`
- GitHub-hosted build with Bun 1.3.14 and Node.js 22
- `cloudflare-production` for the `main` workflow; `cloudflare-preview` for trusted pre-merge uploads
- a repository secret containing a least-privilege, account-scoped Pages Write token, exposed only to the post-merge deploy step
- conservative workflow paths covering every package, docs, example, generator, lockfile, and TypeScript input
- exact-host Bulk Redirect contracts for `www.ggsvelte.sh` and `ggsvelte.pages.dev`, with path/query preservation and subdomain matching disabled

Native Pages Git integration is preferred, but this account's GitHub App installation returned Cloudflare API error `8000011`. Direct Upload is the documented fallback: GitHub Actions checks out the exact head commit, builds and validates `artifact.json`, and uploads those same bytes. Do not broaden the deployment token beyond Pages Write.

The build emits `artifact.json`, `_headers`, `_redirects`, `404.html`, canonical metadata, sitemap, robots, and text discovery endpoints. `artifact.json` binds the artifact to its source commit, route-inventory digest, and build mode. Cloudflare artifacts never fetch or contain mutable benchmark history; `/bench/*` temporarily redirects to the preserved legacy subtree.

## Stop gates

Stop without changing DNS or redirects if any gate fails:

1. The immutable Direct Upload preview did not build from the intended commit.
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

A trusted operator builds the exact reviewed pull-request head and uploads it as a non-production branch preview. The long-lived repository token is never exposed to pull-request code; use a temporary operator token for this one pre-merge gate. Build and upload with:

```sh
DOCS_BUILD_MODE=cloudflare-preview CF_PAGES_COMMIT_SHA=<40-character-commit> \
  bun run build:cloudflare
bunx wrangler pages deploy apps/docs/build \
  --project-name ggsvelte \
  --branch <trusted-branch> \
  --commit-hash <40-character-commit> \
  --commit-dirty=false
```

Confirm the deployment URL is the immutable hash URL, not the mutable branch alias.

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
2. Wait for the `main` Cloudflare Pages workflow and record its deployment ID as the first known-good production deployment.
3. Verify `https://ggsvelte.pages.dev/artifact.json` reports the merged source commit and `cloudflare-production`.
4. Attach `ggsvelte.sh` through Pages Custom Domains.
5. Wait until Cloudflare reports the domain and certificate as `Active`.
6. Smoke apex from fresh requests before changing `www`, `pages.dev`, or GitHub Pages.
7. Create the checked account-level Bulk Redirect list and rule for exact `www.ggsvelte.sh` → apex and exact `ggsvelte.pages.dev` → apex redirects. Preserve query strings and path suffixes, enable subpath matching, and keep include-subdomains disabled.
8. Add the proxied `www` placeholder DNS record required by Bulk Redirects. Do not attach `www` as a second serving domain and do not match hash or branch preview subdomains.
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

## Content Security Policy

CSP is enforced, not report-only. SvelteKit emits a route-specific policy in each prerendered HTML document so its hydration bootstrap can use an exact SHA-256 source. The pre-paint theme bootstrap is the same-origin `/theme.js` file rather than inline executable code. The Pages response header separately enforces `frame-ancestors 'none'`, because browsers ignore that directive in a CSP meta element.

Executable inline scripts, inline event handlers, and broad inline style-element allowances are forbidden. `style-src-attr 'unsafe-inline'` is the sole inline exception: charts and examples emit bounded layout, theme, and palette values as style attributes. Inline style elements remain hash-authorized. `scripts/docs-csp.ts` validates every built HTML file and the final generated 404 before upload.

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

First hour: redirect path/query preservation, enforced-CSP violations, cache headers, 404s, and Core Web Vitals.

First 24–48 hours: deployment errors, old-host traffic, sitemap fetches, Search Console/Bing crawl diagnostics, index coverage, and rollback readiness. Sitemap submission is not evidence of indexing or ranking; follow `docs/search-verification.md`.

Review old-host traffic and maintenance cost after at least 12 months before changing the migration guarantee.
