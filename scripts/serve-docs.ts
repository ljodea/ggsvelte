/**
 * Minimal deterministic static server for the BUILT docs site (apps/docs/
 * build) — the VR suite's webServer (plan: VR runs "against the built static
 * docs site — the artifact that deploys", never the dev server). No
 * dependencies, no directory listings, no caching surprises.
 *
 * adapter-static with the default trailingSlash ("never") writes
 * /examples/point/scatter-color as examples/point/scatter-color.html, so
 * resolution tries: exact file → path + ".html" → path + "/index.html".
 */
import { join, normalize } from "node:path";

const PORT = Number(process.env["PORT"] ?? 4173);
const ROOT = join(import.meta.dir, "..", "apps", "docs", "build");

async function fileResponse(path: string): Promise<Response | null> {
  // normalize + containment check: no traversal outside the build dir.
  const resolved = normalize(join(ROOT, path));
  if (!resolved.startsWith(ROOT)) return null;
  for (const candidate of [resolved, `${resolved}.html`, join(resolved, "index.html")]) {
    const file = Bun.file(candidate);
    if (await file.exists()) return new Response(file);
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const response = await fileResponse(pathname === "/" ? "/index.html" : pathname);
    return response ?? new Response("not found", { status: 404 });
  },
});

console.log(`serving apps/docs/build at http://127.0.0.1:${String(server.port)}`);
