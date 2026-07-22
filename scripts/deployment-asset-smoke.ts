/**
 * Post-deploy integrity checks for SvelteKit immutable assets.
 *
 * Cloudflare Pages flips production to a single deployment. If HTML is served
 * while a referenced `/_app/immutable/*` chunk is missing (or returns the
 * HTML 404 fallback), the browser fails dynamic import and the docs shell
 * shows "500 Internal Error". Smoke the HTML → asset graph before greenlighting.
 */

// Character class: stop at quotes, whitespace, or tag close — not a literal "\s".
const IMMUTABLE_ASSET_RE = /(?:\.\/|\/)?(_app\/immutable\/[^"'>\s]+)/g;

export function extractImmutableAssets(html: string): string[] {
  const assets = new Set<string>();
  for (const match of html.matchAll(IMMUTABLE_ASSET_RE)) {
    const path = match[1];
    if (path !== undefined) assets.add(path);
  }
  return [...assets].toSorted();
}

export interface AssetProbe {
  readonly asset: string;
  readonly url: string;
  readonly status: number;
  readonly contentType: string | null;
}

export interface AssetSmokeProblem {
  readonly path: string;
  readonly message: string;
}

export function evaluateAssetProbe(probe: AssetProbe): string | null {
  if (probe.status !== 200) {
    return `${probe.asset}: expected HTTP 200, received ${String(probe.status)} (${probe.url})`;
  }
  const contentType = probe.contentType?.toLowerCase() ?? "";
  if (probe.asset.endsWith(".js") && contentType.includes("text/html")) {
    return `${probe.asset}: JavaScript URL returned text/html (likely 404 fallback HTML)`;
  }
  if (probe.asset.endsWith(".css") && contentType.includes("text/html")) {
    return `${probe.asset}: CSS URL returned text/html (likely 404 fallback HTML)`;
  }
  return null;
}

export type FetchLike = (
  input: string,
  init?: { redirect?: "manual" | "follow" | "error"; headers?: Record<string, string> },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

export async function smokeImmutableAssets(input: {
  readonly baseUrl: string;
  readonly paths: readonly string[];
  readonly fetchImpl?: FetchLike;
}): Promise<AssetSmokeProblem[]> {
  const origin = new URL(input.baseUrl).origin;
  const fetchImpl = input.fetchImpl ?? (fetch as FetchLike);
  const problems: AssetSmokeProblem[] = [];

  for (const path of input.paths) {
    const pageUrl = new URL(path.startsWith("/") ? path : `/${path}`, `${origin}/`).href;
    let html: string;
    try {
      const response = await fetchImpl(pageUrl, {
        redirect: "follow",
        headers: {
          "cache-control": "no-cache",
          "user-agent": "ggsvelte-deployment-asset-smoke/1",
        },
      });
      if (response.status !== 200) {
        problems.push({
          path,
          message: `${path}: page expected HTTP 200, received ${String(response.status)}`,
        });
        continue;
      }
      html = await response.text();
    } catch (error) {
      problems.push({
        path,
        message: `${path}: page request failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const assets = extractImmutableAssets(html);
    if (assets.length === 0) {
      problems.push({ path, message: `${path}: no /_app/immutable assets found in HTML` });
      continue;
    }

    for (const asset of assets) {
      const assetUrl = new URL(asset, `${origin}/`).href;
      try {
        const response = await fetchImpl(assetUrl, {
          redirect: "follow",
          headers: {
            "cache-control": "no-cache",
            "user-agent": "ggsvelte-deployment-asset-smoke/1",
          },
        });
        const probe: AssetProbe = {
          asset,
          url: assetUrl,
          status: response.status,
          contentType: response.headers.get("content-type"),
        };
        const problem = evaluateAssetProbe(probe);
        if (problem !== null) problems.push({ path, message: problem });
      } catch (error) {
        problems.push({
          path,
          message: `${asset}: request failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  return problems;
}
