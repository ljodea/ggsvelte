/**
 * Split reference ledes so Geom* (and Stat* when present) tokens become links
 * to their reference pages. Plain text stays plain; no markdown or {@html}.
 */

export type LedeSegment =
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "link";
      readonly label: string;
      /** Path under the site base, e.g. /reference/geoms/col */
      readonly href: string;
    };

const TOKEN_RE = /\b(Geom|Stat)([A-Z][A-Za-z0-9]*)\b/g;

/**
 * PascalCase body after the Geom/Stat prefix → snake_case catalog slug.
 * GeomCol → col, GeomDensity2dFilled → density_2d_filled, GeomQqLine → qq_line.
 */
export function pascalBodyToSlug(body: string): string {
  return body
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replaceAll(/([A-Za-z])(\d)/g, "$1_$2")
    .toLowerCase();
}

/**
 * Segment a summary into text + links. Only tokens whose slug is in
 * `knownSlugs` for that family become links (so typos stay plain text).
 */
export function segmentReferenceLede(
  text: string,
  known: {
    readonly geoms: ReadonlySet<string>;
    readonly stats: ReadonlySet<string>;
  },
): readonly LedeSegment[] {
  const out: LedeSegment[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    const [full, family, body] = match;
    if (body === undefined || family === undefined) continue;
    const start = match.index;
    if (start > last) {
      out.push({ kind: "text", value: text.slice(last, start) });
    }
    const slug = pascalBodyToSlug(body);
    const isGeom = family === "Geom";
    const allowed = isGeom ? known.geoms : known.stats;
    if (allowed.has(slug)) {
      out.push({
        kind: "link",
        label: full,
        href: isGeom ? `/reference/geoms/${slug}` : `/reference/stats/${slug}`,
      });
    } else {
      // Unknown token — keep as plain text (merge with previous text segment).
      const prev = out.at(-1);
      if (prev?.kind === "text") {
        out[out.length - 1] = { kind: "text", value: prev.value + full };
      } else {
        out.push({ kind: "text", value: full });
      }
    }
    last = start + full.length;
  }
  if (last < text.length) {
    const tail = text.slice(last);
    const prev = out.at(-1);
    if (prev?.kind === "text") {
      out[out.length - 1] = { kind: "text", value: prev.value + tail };
    } else {
      out.push({ kind: "text", value: tail });
    }
  }
  if (out.length === 0) {
    out.push({ kind: "text", value: text });
  }
  return out;
}
