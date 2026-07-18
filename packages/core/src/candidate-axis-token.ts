import type { CellValue } from "./table.js";

export type CanonicalAxisToken =
  | Readonly<{ kind: "number"; value: number }>
  | Readonly<{ kind: "string"; value: string }>
  | Readonly<{ kind: "boolean"; value: boolean }>;

export function canonicalAxisToken(value: CellValue): CanonicalAxisToken | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? { kind: "number", value: time } : null;
  }
  if (typeof value === "number")
    return Number.isFinite(value)
      ? { kind: "number", value: Object.is(value, -0) ? 0 : value }
      : null;
  if (typeof value === "string") return { kind: "string", value };
  if (typeof value === "boolean") return { kind: "boolean", value };
  return null;
}

/** Compact map key for a canonical axis token (package-internal). */
export function tokenKey(token: CanonicalAxisToken): string {
  if (token.kind === "number") return `n:${token.value}`;
  if (token.kind === "string") return `s:${token.value.length}:${token.value}`;
  return token.value ? "b:1" : "b:0";
}

/** Total order over canonical axis tokens (package-internal). */
export function compareTokens(a: CanonicalAxisToken, b: CanonicalAxisToken): number {
  const rank = { number: 0, string: 1, boolean: 2 } as const;
  const kind = rank[a.kind] - rank[b.kind];
  if (kind !== 0) return kind;
  if (a.kind === "number" && b.kind === "number") return a.value - b.value;
  if (a.kind === "string" && b.kind === "string")
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  if (a.kind === "boolean" && b.kind === "boolean") return Number(a.value) - Number(b.value);
  return 0;
}
