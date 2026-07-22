/**
 * Strftime-style UTC time formatting for `scales.*.labels` time patterns.
 *
 * Tokens: %Y %y %m %b %B %d %e %H %M %S %L %%
 * Unknown format tokens pass through literally. Deterministic en-US months.
 */
export const MONTHS_SHORT = [
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
export const MONTHS_LONG = [
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

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const pad3 = (n: number) => String(n).padStart(3, "0");

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
