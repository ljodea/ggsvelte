/**
 * Numeric label format strings for `scales.*.labels` (documented d3-format subset).
 *
 *   "d"     integer (rounded)
 *   ",d"    integer with thousands grouping
 *   ".2f"   fixed decimals
 *   ",.2f"  fixed decimals with grouping
 *   ".0%"   percent
 *   "~s" / "s"  SI prefix
 *
 * Unknown format strings fall back to default formatting and report `ok: false`.
 */
const NUMERIC_FORMAT_RE = /^(,)?(?:\.(\d+))?(~)?([dfs%])$/;

const SI_PREFIXES: [number, string][] = [
  [1e12, "T"],
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
];

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

function siFormat(v: number, tilde: boolean, precision: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  let scale = 1;
  let prefix = "";
  for (const [factor, p] of SI_PREFIXES) {
    if (abs >= factor) {
      scale = factor;
      prefix = p;
      break;
    }
  }
  const scaled = v / scale;
  const digits = Math.max(0, precision - 1 - Math.floor(Math.log10(Math.abs(scaled))));
  const fixed = scaled.toFixed(Math.min(20, digits));
  return (tilde ? trimZeros(fixed) : fixed) + prefix;
}

export interface NumberFormatter {
  /** False when the format string was not recognized (fallback in effect). */
  ok: boolean;
  format(v: number): string;
}

/** Compile a numeric label format string (subset documented above). */
export function numberFormatter(spec: string): NumberFormatter {
  const match = NUMERIC_FORMAT_RE.exec(spec);
  if (match === null) {
    return { ok: false, format: String };
  }
  const grouped = match[1] === ",";
  const decimals = match[2] === undefined ? undefined : Number(match[2]);
  const tilde = match[3] === "~";
  const type = match[4]!;
  const locale = (v: number, digits: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: grouped,
    });
  switch (type) {
    case "d":
      return {
        ok: true,
        format: (v) => (Number.isFinite(v) ? locale(Math.round(v), 0) : String(v)),
      };
    case "f": {
      const digits = decimals ?? 2;
      return { ok: true, format: (v) => (Number.isFinite(v) ? locale(v, digits) : String(v)) };
    }
    case "%": {
      const digits = decimals ?? 0;
      return {
        ok: true,
        format: (v) => (Number.isFinite(v) ? locale(v * 100, digits) + "%" : String(v)),
      };
    }
    default: // "s"
      return {
        ok: true,
        format: (v) => (Number.isFinite(v) ? siFormat(v, tilde, decimals ?? 3) : String(v)),
      };
  }
}
