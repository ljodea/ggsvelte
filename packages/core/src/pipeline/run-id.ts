/**
 * Monotonic pipeline run identity (module-global).
 */
let nextRunId = 0;

export function allocatePipelineRunId(): number {
  return ++nextRunId;
}
