/**
 * Polyfill-free ISO-8601 → epoch-ms for lean render paths.
 * Deliberately avoids the global date-string parser (banned by temporal-source-gate).
 */
const ISO_LIKE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:Z|([+-])(\d{2}):?(\d{2}))?)?$/;

export function isIsoLikeString(value: string): boolean {
  // isoEpochMs already rejects non-matching shapes, so one regex run suffices
  // (this runs per string cell during column coercion).
  return isoEpochMs(value) !== undefined;
}

/** True when the ISO string carries a clock component (time or datetime). */
export function isoHasClock(value: string): boolean {
  return /[T ]\d{2}:\d{2}/.test(value);
}

/** Parse common ISO date/datetime strings to UTC epoch ms, or undefined. */
export function isoEpochMs(value: string): number | undefined {
  const match = ISO_LIKE.exec(value);
  if (match === null) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  // Truncate fractional seconds to milliseconds (up to 9 digits accepted).
  const fractionRaw = match[7] ?? "0";
  const fraction = Number(fractionRaw.padEnd(3, "0").slice(0, 3));
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  // Date.UTC maps years 0–99 to 1900+; use setUTCFullYear for full range.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, fraction);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  let epoch = date.getTime();
  if (match[8] !== undefined) {
    const sign = match[8] === "+" ? 1 : -1;
    const offH = Number(match[9]);
    const offM = Number(match[10]);
    if (offH > 23 || offM > 59) return undefined;
    epoch -= sign * (offH * 60 + offM) * 60_000;
  }
  return epoch;
}
