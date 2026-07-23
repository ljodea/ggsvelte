# PR 8 clean-room author-success audit

Date: 2026-07-22

## Journey

1. Install the three packed workspace packages into a clean SvelteKit consumer.
2. Paste the documented first chart without preprocessing.
3. Run strict Svelte type checking, build/prerender, Core runtime/SSR smoke, and installed CLI file/stdin renders.
4. Open the fixed-aspect gallery example and verify the same PortableSpec concept across Svelte, builder, and JSON tabs.

## Result

- npm packed consumer: PASS, including install, strict check, build/prerender, Core runtime/SSR, and CLI.
- pnpm packed consumer: PASS with the same checks.
- Each successful clean install-to-render trial completed inside the five-minute target.
- The fixed-aspect example was discoverable from the gallery and rendered at 1280px and 375px with no console errors or horizontal overflow.
- The data rectangle measured exactly 1.000 at both widths (0% error against the 1% acceptance threshold).

## Local environment note

The Bun consumer trial reached package installation, then failed because this workstation combines native arm64 Bun with an x64 system Node; Rollup selected an arm64 optional native package while the child `svelte-kit` process ran under x64 Node. This is a host architecture mismatch, not a package/type/render failure. The isolated homogeneous CI packed-consumer matrix remains authoritative. No external model or paid API was invoked.
