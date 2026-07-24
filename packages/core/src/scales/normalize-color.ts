/** Normalize #rgb / #rrggbb color stops to lowercase #rrggbb. */
export function normalizeColor(stop: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(stop);
  if (match === null) {
    throw new RangeError(`Sequential color stops must use #rgb or #rrggbb syntax (got "${stop}").`);
  }
  const digits = match[1]!.toLowerCase();
  return digits.length === 3
    ? `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    : `#${digits}`;
}
