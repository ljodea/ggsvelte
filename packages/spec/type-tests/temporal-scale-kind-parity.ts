/**
 * `monthDay` is a scale intent, never a parse outcome — checked by tsc.
 *
 * The two kinds look interchangeable and are compared against each other all
 * over the pipeline (`decision.kind === conversion.requestedKind`). If
 * `TemporalKind` were simply widened, every one of those comparisons would go
 * on type-checking while quietly admitting a value no parser can produce.
 * Keeping the union split is what makes that a compile error, so the split
 * itself has to be pinned here rather than in a runtime test.
 */
import type {
  TemporalKind,
  TemporalParseResult,
  TemporalScaleKind,
} from "../src/temporal-parse-core.js";

type Assert<Condition extends true> = Condition;

/** A scale may ask for month-day. */
export type ScaleKindAdmitsMonthDay = Assert<"monthDay" extends TemporalScaleKind ? true : false>;

/** Parsing a value never yields it. */
export type ParseKindRejectsMonthDay = Assert<"monthDay" extends TemporalKind ? false : true>;

/** Nor does a successful parse result, which is what the comparisons read. */
export type ParseResultRejectsMonthDay = Assert<
  "monthDay" extends Extract<TemporalParseResult, { ok: true }>["kind"] ? false : true
>;

/** The scale kind is a strict superset, so every parse kind still flows in. */
export type ScaleKindCoversParseKind = Assert<
  TemporalKind extends TemporalScaleKind ? true : false
>;
