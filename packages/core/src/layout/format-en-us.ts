/**
 * ICU-free `toLocaleString("en-US", { minimumFractionDigits: d,
 * maximumFractionDigits: d, useGrouping })` for finite numbers.
 *
 * `toLocaleString` is the single hottest leaf in small-chart renders
 * (per-tick-label ICU calls are ~20% of a stacked-bars pipeline run).
 *
 * Rounding must match ICU, which rounds the SHORTEST decimal
 * representation of the double half-up (1.005 → "1.01" even though the
 * stored binary value is 1.00499999…). `toFixed` rounds the binary value
 * and is not a substitute. The manual path therefore rounds the decimal
 * string produced by `String(abs)` (shortest round-trip digits). Values
 * whose shortest repr is exponential (|v| < 1e-6 or ≥ 1e21) delegate to
 * ICU — output is identical everywhere by construction.
 *
 * Package-internal; not exported from the package barrel.
 */

function roundShortestDecimal(abs: number, decimals: number): string | null {
  const repr = String(abs);
  if (repr.includes("e") || repr.includes("E")) return null;
  const dot = repr.indexOf(".");
  const intStr = dot === -1 ? repr : repr.slice(0, dot);
  const fracStr = dot === -1 ? "" : repr.slice(dot + 1);
  if (fracStr.length <= decimals) {
    if (decimals === 0) return intStr;
    return `${intStr}.${fracStr.padEnd(decimals, "0")}`;
  }
  // Combined kept digits (integer part + kept fraction) as a mutable array.
  const kept = intStr + fracStr.slice(0, decimals);
  const digits = Array.from(kept, (ch) => ch.codePointAt(0) - 48);
  if (fracStr.codePointAt(decimals) >= 53) {
    // '5' — round half-up, like ICU on the shortest decimal form.
    let i = digits.length - 1;
    while (i >= 0) {
      if (digits[i]! < 9) {
        digits[i] = digits[i]! + 1;
        break;
      }
      digits[i] = 0;
      i--;
    }
    if (i < 0) digits.unshift(1);
  }
  const intLen = digits.length - decimals;
  let out = "";
  for (let i = 0; i < digits.length; i++) out += String(digits[i]);
  if (decimals === 0) return out;
  return `${out.slice(0, intLen)}.${out.slice(intLen)}`;
}

export function formatEnUS(v: number, decimals: number, useGrouping: boolean): string {
  const abs = Math.abs(v);
  const rounded = roundShortestDecimal(abs, decimals);
  if (rounded === null) {
    return v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
  }
  const neg = v < 0 || Object.is(v, -0);
  if (!useGrouping) return neg ? `-${rounded}` : rounded;
  const dot = rounded.indexOf(".");
  const intPart = dot === -1 ? rounded : rounded.slice(0, dot);
  const fracPart = dot === -1 ? "" : rounded.slice(dot);
  let grouped = "";
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) grouped += ",";
    grouped += intPart[i];
  }
  return (neg ? "-" : "") + grouped + fracPart;
}

/**
 * `toLocaleString("en-US", { minimumFractionDigits: 0,
 * maximumFractionDigits: maxDecimals, useGrouping })` — the variable-
 * precision form (trailing fraction zeros trimmed).
 */
export function formatEnUSMaxDecimals(
  v: number,
  maxDecimals: number,
  useGrouping: boolean,
): string {
  const fixed = formatEnUS(v, maxDecimals, useGrouping);
  const dot = fixed.indexOf(".");
  if (dot === -1) return fixed;
  let end = fixed.length;
  while (end > dot + 1 && fixed.codePointAt(end - 1) === 48) end--;
  return end === dot + 1 ? fixed.slice(0, dot) : fixed.slice(0, end);
}
