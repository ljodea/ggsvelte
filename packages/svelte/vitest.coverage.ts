/**
 * Shared coverage scope for the browser and SSR vitest configs — one source
 * for provider/include so the two reports never measure different file sets.
 * Opt-in via --coverage; reportsDirectory differs per config.
 */
export const coverageBase = {
  provider: "v8",
  // Keep the uncovered-file pass on executable sources. The package also
  // ships fonts and notices under src/lib, which are not coverage targets.
  include: ["src/lib/**/*.{ts,svelte}"],
  // text for local runs; lcov for Codecov uploads from CI.
  reporter: ["text", "lcov"],
  enabled: false,
} as const;
