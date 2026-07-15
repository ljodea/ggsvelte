import type { Plugin } from "vite";

/**
 * Test-only Vite endpoint that renders the canonical hydration component in
 * the server module graph. Browser tests fetch this exact body before calling
 * hydrate, so the gate exercises real SSR output rather than hand-copied HTML.
 */
export function ggplotSsrEndpoint(): Plugin {
  return {
    name: "ggplot-test-ssr-endpoint",
    configureServer(server) {
      server.middlewares.use("/__ggplot-ssr", (_request, response) => {
        void (async () => {
          try {
            const module = (await server.ssrLoadModule(
              "/tests/fixtures/GGPlotHydrationFixture.svelte",
            )) as { default: unknown };
            // Load render through the same SSR graph as the component. Importing
            // it from the config graph would create two Svelte server runtimes.
            const serverRuntime = (await server.ssrLoadModule("svelte/server")) as {
              render: (component: unknown, options: { props: object }) => { body: string };
            };
            const result = serverRuntime.render(module.default, { props: {} });
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(result.body);
          } catch (error) {
            response.statusCode = 500;
            response.end(error instanceof Error ? error.stack : String(error));
          }
        })();
      });
    },
  };
}
