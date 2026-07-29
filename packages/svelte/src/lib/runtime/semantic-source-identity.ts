/**
 * Source-identity tracker owned by one GGPlot instance for the component
 * lifetime. Do not clear: clearing would silently reset dataIdentityEpoch and
 * break unstable-key detection across respecs.
 */
export type SourceIdentityTracker = {
  sourceIdentity(value: unknown): string;
};

export function createSourceIdentityTracker(): SourceIdentityTracker {
  const sourceIdentities = new WeakMap<object, number>();
  let nextSourceIdentity = 1;
  return {
    sourceIdentity(value: unknown): string {
      if ((typeof value !== "object" && typeof value !== "function") || value === null)
        return String(value);
      let identity = sourceIdentities.get(value);
      if (identity === undefined) {
        identity = nextSourceIdentity++;
        sourceIdentities.set(value, identity);
      }
      return String(identity);
    },
  };
}
