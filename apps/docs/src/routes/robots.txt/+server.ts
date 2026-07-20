import { docsBuildConfig } from "$lib/server/build-config";

import type { RequestHandler } from "./$types";

export const prerender = true;

export const GET: RequestHandler = () => {
  const config = docsBuildConfig();
  const policy = config.indexable ? "Allow: /" : "Disallow: /";
  const body = `User-agent: *\n${policy}\nSitemap: ${config.canonicalBase}/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
