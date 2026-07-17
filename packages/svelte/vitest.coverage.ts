/**
 * Shared coverage scope for the browser and SSR vitest configs — one source
 * for provider/include so the two reports never measure different file sets.
 * Opt-in via --coverage; reportsDirectory differs per config.
 */
export const coverageBase = {
  provider: "v8",
  include: ["src/lib/**"],
  enabled: false,
} as const;
