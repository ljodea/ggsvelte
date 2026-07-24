---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: republish after missing `@ggsvelte/spec@0.10.1` npm tarball

`changeset publish` reported success for `@ggsvelte/spec@0.10.1` and wrote
registry metadata (including dist integrity/shasum), but the tarball URL
`https://registry.npmjs.org/@ggsvelte/spec/-/spec-0.10.1.tgz` returns HTTP 404.
`@ggsvelte/core@0.10.1` and `@ggsvelte/svelte@0.10.1` tarballs are fine.
Because those packages depend on `@ggsvelte/spec@^0.10.1`, installs of 0.10.1
fail end-to-end.

No source changes — lockstep fixed-group patch so 0.10.2 re-uploads all three
package tarballs and consumers can resolve a complete release again.
