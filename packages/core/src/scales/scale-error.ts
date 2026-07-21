/**
 * ScaleConfigError — a misconfigured scale (bad explicit domain, a transform
 * over out-of-domain values, an impossible transform key). Thrown by the pure
 * scale layer; the pipeline wraps it in a structured PipelineError with the
 * same `code`. Lives in its own leaf module so the transform registry and the
 * trainer can both depend on it without a cycle.
 */
export class ScaleConfigError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ScaleConfigError";
    this.code = code;
  }
}
