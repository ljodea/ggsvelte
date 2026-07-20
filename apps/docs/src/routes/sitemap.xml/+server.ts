import { canonicalUrl, sitemapRoutes } from "$lib/routes";
import { docsBuildConfig } from "$lib/server/build-config";

import type { RequestHandler } from "./$types";

const xmlEscape = (value: string): string => value.replaceAll("&", "&amp;");

export const prerender = true;

export const GET: RequestHandler = () => {
  const config = docsBuildConfig();
  const urls = sitemapRoutes()
    .map(
      (route) => `  <url><loc>${xmlEscape(canonicalUrl(route, config.canonicalBase))}</loc></url>`,
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
};
