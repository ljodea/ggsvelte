/**
 * Extract attribute text from opening `<GGPlot …>` tags.
 *
 * Must not stop at `>` inside attribute values (e.g. `onselect={(e) => …}`),
 * so the scanner tracks brace and quote nesting.
 */

/** Attributes on every opening `<GGPlot …>` tag (not children). */
export function ggplotOpenAttrs(source: string): string[] {
  const attrs: string[] = [];
  let i = 0;
  while (i < source.length) {
    const start = source.indexOf("<GGPlot", i);
    if (start === -1) break;
    // Word boundary: avoid matching a longer tag name if one appears later.
    const after = start + "<GGPlot".length;
    if (after < source.length && /[\w-]/.test(source[after]!)) {
      i = after;
      continue;
    }
    // Scan from after the tag name for the real closing `>`.
    let j = after;
    let depth = 0;
    let quote: '"' | "'" | null = null;
    while (j < source.length) {
      const ch = source[j]!;
      if (quote !== null) {
        if (ch === "\\") {
          j += 2;
          continue;
        }
        if (ch === quote) quote = null;
        j += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        j += 1;
        continue;
      }
      if (ch === "{") {
        depth += 1;
        j += 1;
        continue;
      }
      if (ch === "}") {
        depth = Math.max(0, depth - 1);
        j += 1;
        continue;
      }
      if (ch === ">" && depth === 0) {
        attrs.push(source.slice(after, j));
        i = j + 1;
        break;
      }
      j += 1;
    }
    if (j >= source.length) {
      // Unclosed tag — stop scanning rather than hang.
      break;
    }
  }
  return attrs;
}

/** Forbidden plot-level interaction props on a GGPlot open-tag attribute string. */
export function plotLevelInteractionOffenders(attrs: string): string[] {
  const offenders: string[] = [];
  if (/\blegendFocus\b/.test(attrs)) offenders.push("legendFocus");
  if (/\blegendFilter\b/.test(attrs)) offenders.push("legendFilter");
  // Bare inspect= on GGPlot. oninspect= is a handler (prefix keeps it out).
  if (/(?<![\w])inspect\s*=/.test(attrs)) offenders.push("inspect=");
  return offenders;
}
