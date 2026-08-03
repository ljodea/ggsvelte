import type { Plugin } from "vite";

/**
 * Test-only Vite endpoint that renders the canonical hydration component in
 * the server module graph. Browser tests fetch this exact body before calling
 * hydrate, so the gate exercises real SSR output rather than hand-copied HTML.
 *
 * The body renders once and is cached for the server's lifetime: three
 * browser instances fetch the same deterministic body, and a single slow
 * SSR-graph transform under full-lane contention must not be paid per fetch
 * (#1420 lane runs showed per-fetch re-renders tipping the release-matrix
 * hydration gate past its timeout). Errors are never cached.
 */
export function ggplotSsrEndpoint(): Plugin {
  // Shared in-flight promise: concurrent first fetches (three browser
  // instances under full-lane load) join ONE SSR transform instead of
  // queueing three. Rejected promises are dropped so a later fetch retries.
  let pending: Promise<string> | null = null;
  const renderBody = (server: {
    ssrLoadModule: (id: string) => Promise<unknown>;
  }): Promise<string> => {
    pending ??= (async () => {
      const t0 = Date.now();
      console.error("[__ggplot-ssr] render start", t0);
      const module = (await server.ssrLoadModule(
        "/tests/fixtures/GGPlotHydrationFixture.svelte",
      )) as { default: unknown };
      console.error("[__ggplot-ssr] fixture loaded after", Date.now() - t0, "ms");
      // Load render through the same SSR graph as the component. Importing
      // it from the config graph would create two Svelte server runtimes.
      const serverRuntime = (await server.ssrLoadModule("svelte/server")) as {
        render: (component: unknown, options: { props: object }) => { body: string };
      };
      console.error("[__ggplot-ssr] svelte/server loaded after", Date.now() - t0, "ms");
      const body = serverRuntime.render(module.default, { props: {} }).body;
      console.error("[__ggplot-ssr] rendered after", Date.now() - t0, "ms");
      return body;
    })();
    pending.catch(() => {
      pending = null;
    });
    return pending;
  };
  return {
    name: "ggplot-test-ssr-endpoint",
    configureServer(server) {
      server.middlewares.use("/__ggplot-ssr", (_request, response) => {
        void (async () => {
          try {
            const body = await renderBody(server);
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(body);
          } catch (error) {
            response.statusCode = 500;
            response.end(error instanceof Error ? error.stack : String(error));
          }
        })();
      });
    },
  };
}
