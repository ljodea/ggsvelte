/**
 * The model interface for the eval harness responders.
 *
 * Implementations live beside this file: `openrouter.ts` (live model) and
 * `mock/responder.ts` (deterministic template responder). Re-exported from
 * `tests/evals/model.ts` for the harness.
 */
export interface Responder {
  /** Human-readable identifier for the scoreboard meta. */
  readonly name: string;
  complete(system: string, user: string): Promise<string>;
}
