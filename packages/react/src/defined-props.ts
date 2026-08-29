/** Copy own enumerable keys whose value is not `undefined`. */
export function definedProps<T extends object>(props: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    const value = (props as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}
