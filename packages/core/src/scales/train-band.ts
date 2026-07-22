/** Band (discrete categorical) positional scale training. */
import { encodeKey } from "./state.js";
import type { BandScale } from "./train-types.js";

/** Canonical string key for a band category (band domains render as labels). */
export function bandKey(value: unknown): string {
  if (value === null || value === undefined) return "(null)";
  if (value instanceof Date) return value.toISOString();
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return JSON.stringify(value) ?? "(unknown)";
  }
}

export interface BandConfig {
  /** Explicit category list — PINS the domain (out-of-domain rows drop). */
  domain?: readonly unknown[];
  reverse?: boolean;
}

/** Band scale: pinned (explicit domain) or first-seen over the present data. */
export function trainBand(
  columns: readonly (readonly unknown[])[],
  config: BandConfig = {},
): BandScale {
  const index = new Map<string, number>();
  const rawDomain: unknown[] = [];
  const add = (value: unknown): void => {
    const key = encodeKey(value);
    if (index.has(key)) return;
    index.set(key, index.size);
    rawDomain.push(value);
  };
  if (config.domain === undefined) {
    for (const column of columns) for (const value of column) add(value);
  } else {
    for (const value of config.domain) add(value);
  }
  const domain = rawDomain.map((value) => bandKey(value));
  const n = domain.length;
  const reverse = config.reverse === true;
  const indexOf = (value: unknown) => index.get(encodeKey(value));
  return {
    type: "band",
    domain: Object.freeze(domain),
    rawDomain: Object.freeze(rawDomain),
    indexOf,
    step: n === 0 ? 1 : 1 / n,
    normalize: (value: unknown) => {
      const i = indexOf(value);
      if (i === undefined || n === 0) return void 0;
      const t = (i + 0.5) / n;
      return reverse ? 1 - t : t;
    },
  };
}
