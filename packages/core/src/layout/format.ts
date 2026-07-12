/**
 * Label format strings (the `scales.*.labels` surface).
 *
 * Numeric formats — a small, documented d3-format-style subset (hand-rolled;
 * the full d3-format grammar is deliberately NOT claimed):
 *   "d"     integer (rounded)
 *   ",d"    integer with thousands grouping
 *   ".2f"   fixed decimals (any digit count)
 *   ",.2f"  fixed decimals with grouping
 *   ".0%"   percent (value * 100, fixed decimals)
 *   "~s"    SI prefix (1500 -> "1.5k"), trailing zeros trimmed
 *   "s"     SI prefix, 3 significant digits
 *
 * Time formats — a strftime-style subset over UTC (hand-rolled; decision
 * recorded in docs/decisions/0008: no d3-time-format dependency, formatting
 * is deterministic en-US):
 *   %Y %y %m %b %B %d %e %H %M %S %L %%
 *
 * Unknown format strings fall back to default formatting and report
 * `ok: false` so the pipeline can emit a warning (never throw over a label).
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad3 = (n: number) => String(n).padStart(3, "0");

/** Format an epoch-ms timestamp with a strftime-style pattern (UTC). */
export function formatTime(ms: number, pattern: string): string {
  const d = new Date(ms);
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch !== "%") {
      out += ch;
      continue;
    }
    const code = pattern[++i] ?? "";
    switch (code) {
      case "Y":
        out += String(d.getUTCFullYear());
        break;
      case "y":
        out += pad2(d.getUTCFullYear() % 100);
        break;
      case "m":
        out += pad2(d.getUTCMonth() + 1);
        break;
      case "b":
        out += MONTHS_SHORT[d.getUTCMonth()]!;
        break;
      case "B":
        out += MONTHS_LONG[d.getUTCMonth()]!;
        break;
      case "d":
        out += pad2(d.getUTCDate());
        break;
      case "e":
        out += String(d.getUTCDate());
        break;
      case "H":
        out += pad2(d.getUTCHours());
        break;
      case "M":
        out += pad2(d.getUTCMinutes());
        break;
      case "S":
        out += pad2(d.getUTCSeconds());
        break;
      case "L":
        out += pad3(d.getUTCMilliseconds());
        break;
      case "%":
        out += "%";
        break;
      default:
        out += `%${code}`; // unknown token passes through literally
        break;
    }
  }
  return out;
}

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
