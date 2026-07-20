import type { PositionScaleSpec } from "@ggsvelte/spec";

export interface ScaleDiagnosticFix {
  description: string;
  portable?: unknown;
  typescript?: string;
}

export interface ScaleDiagnostic {
  code: string;
  severity: "advisory" | "warning" | "error";
  path: string;
  problem: string;
  cause: string;
  fixes: readonly ScaleDiagnosticFix[];
  evidence?: Readonly<{
    values?: readonly (string | number | boolean | null)[];
    failedCount?: number;
    candidates?: readonly string[];
  }>;
  documentationUrl: string;
}

export interface ScaleDecision {
  aesthetic: "x" | "y";
  field: string;
  status: "temporal" | "nominal";
  parser: string | null;
  kind: "date" | "datetime" | null;
  precision: "year" | "quarter" | "month" | "date" | "minute" | "second" | "millisecond" | null;
  evidence: readonly (string | number | boolean | null)[];
  validatedCount: number;
  ambiguity: readonly string[];
  domain?: readonly (string | number | boolean | null)[];
  guidePlanIds?: readonly string[];
  portableOverride: Readonly<PositionScaleSpec>;
}
