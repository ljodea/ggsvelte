/**
 * Polyfill-free ISO-8601 → epoch-ms for lean render paths.
 * Deliberately avoids the global date-string parser (banned by temporal-source-gate).
 */
const ISO_LIKE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|([+-])(\d{2}):?(\d{2}))?)?$/;

export function isIsoLikeString(value: string): boolean {
  return ISO_LIKE.test(value) && isoEpochMs(value) !== undefined;
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
  const fraction = match[7] === undefined ? 0 : Number(match[7].padEnd(3, "0"));
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  let epoch = Date.UTC(year, month - 1, day, hour, minute, second, fraction);
  // Reject overflow (e.g. 2024-02-30 → March) by round-tripping the calendar day.
  const check = new Date(epoch);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }
  if (match[8] !== undefined) {
    const sign = match[8] === "+" ? 1 : -1;
    const offH = Number(match[9]);
    const offM = Number(match[10]);
    if (offH > 23 || offM > 59) return undefined;
    epoch -= sign * (offH * 60 + offM) * 60_000;
  }
  return epoch;
}
