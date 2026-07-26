/**
 * Codemod: deprecated <GGPlot> grammar props → declaration-only child layers
 * (#659 slice 7, closes #290).
 *
 * Rewrites the seven props deprecated in 0.11.0 — facet, coord, scales,
 * guides, legend, theme, labs — into the child components that replace them,
 * and adds the components to whichever import statement already provided
 * `GGPlot`.
 *
 * ## Why children go first
 *
 * D2: assemblePortableSpec applies props first, then child plotLayers in
 * registration order. A prop that becomes a child must therefore register
 * BEFORE any child the file already had, or a pre-existing `<ScaleColorDiscrete/>`
 * would stop winning over the migrated `scales` prop. Inserting immediately
 * after the open tag preserves the old precedence exactly.
 *
 * ## Semantic confidence (ADR 0013)
 *
 * Only meaning-preserving rewrites are performed. Each target component's
 * props type is the prop's own type, so the rewrite cannot change the
 * assembled PortableSpec:
 *
 *   coord / scales / guides  →  <Coord|Scale|Guides value={…}/>   (`value` IS the prop type)
 *   facet / legend / labs    →  <Facet|Legend|Labs {...…}/>       (flat prop bags)
 *   theme (string literal)   →  <Theme name="…"/>
 *
 * `theme={expr}` is NOT rewritten: `theme` is `ThemeName | ThemeSpec`, and
 * `<Theme>` takes `name` plus role overrides with no `value` hatch, so an
 * object-valued expression cannot be routed without judgment. It is reported
 * as a manual change with the guide anchor rather than half-migrated.
 *
 * Named shells (`<ThemeDark/>`, `<ScaleColorDiscrete scheme="…"/>`) are what
 * the guide recommends by hand, but the codemod never produces them: mapping a
 * value onto a helper is a style choice, and for scales it is not even
 * byte-identity-preserving (D8 — `normalize()` does not infer scale `type`).
 * The escape hatches are the mechanical, always-correct target.
 */
import { parse } from "svelte/compiler";

import { applyEdits, type Edit } from "./edits.js";

const GUIDE = "https://ggsvelte.sh/guide/upgrading";

/** How a deprecated prop's value is handed to its replacement component. */
type Form = "value" | "spread" | "theme";

interface PropRule {
  readonly component: string;
  readonly form: Form;
  readonly docUrl: string;
}

/** The seven props deprecated in 0.11.0, in GGPlotProps declaration order. */
const RULES: Readonly<Record<string, PropRule>> = {
  facet: { component: "Facet", form: "spread", docUrl: `${GUIDE}#compose-facet-as-a-child-layer` },
  coord: { component: "Coord", form: "value", docUrl: `${GUIDE}#compose-coord-as-a-child-layer` },
  scales: { component: "Scale", form: "value", docUrl: `${GUIDE}#compose-scales-as-child-layers` },
  guides: { component: "Guides", form: "value", docUrl: `${GUIDE}#compose-guides-as-child-layers` },
  legend: {
    component: "Legend",
    form: "spread",
    docUrl: `${GUIDE}#compose-legend-as-a-child-layer`,
  },
  theme: {
    component: "Theme",
    form: "theme",
    docUrl: `${GUIDE}#compose-the-theme-as-a-child-layer`,
  },
  labs: { component: "Labs", form: "spread", docUrl: `${GUIDE}#compose-labs-as-a-child-layer` },
};

/** A prop this run rewrote. */
export interface PropChange {
  readonly prop: string;
  readonly component: string;
  readonly line: number;
}

/** A prop this run deliberately left alone, with the manual-change pointer. */
export interface PropSkip {
  readonly prop: string;
  readonly line: number;
  readonly reason: string;
  readonly docUrl: string;
}

/** The module specifier a consumer imports `GGPlot` from. */
export const PACKAGE_SPECIFIER = "@ggsvelte/svelte";

export interface MigrateOptions {
  /**
   * Extra module specifiers that also count as ggsvelte, on top of
   * {@link PACKAGE_SPECIFIER}. Exists for this repo's own sources, which
   * import through relative paths; consumers never need it.
   */
  readonly sources?: readonly string[];
}

export interface MigrationResult {
  /** Migrated source. Byte-identical to the input when nothing was rewritten. */
  readonly code: string;
  readonly changes: readonly PropChange[];
  readonly skipped: readonly PropSkip[];
}

// ---------------------------------------------------------------------------
// AST shapes
//
// svelte/compiler's public types describe the template but leave `expression`
// as an ESTree node, so the few ESTree members this transform reads are
// declared structurally here rather than pulling in an estree dependency.
// ---------------------------------------------------------------------------

interface Node {
  readonly type: string;
  readonly start: number;
  readonly end: number;
}

interface EsProperty extends Node {
  readonly type: "Property";
  readonly kind: string;
  readonly computed: boolean;
  readonly method: boolean;
  readonly shorthand: boolean;
  readonly key: Node & { readonly name?: string; readonly value?: unknown };
  /** `raw` is present on Literal nodes only — the sole ESTree member read here. */
  readonly value: Node & { readonly raw?: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Every object reachable one step down, arrays flattened.
 *
 * Deliberately not filtered to {@link isNode}: `Fragment` carries the children
 * of an element but has no start/end, so a node-only walk stops at the first
 * `<div>` and silently skips every plot nested inside one.
 */
function childObjects(value: unknown): unknown[] {
  if (!isRecord(value)) return [];
  const out: unknown[] = [];
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) out.push(...child.filter((item) => isRecord(item)));
    else if (isRecord(child)) out.push(child);
  }
  return out;
}

function isNode(value: unknown): value is Node {
  return (
    isRecord(value) &&
    typeof value["type"] === "string" &&
    typeof value["start"] === "number" &&
    typeof value["end"] === "number"
  );
}

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

/** Leading whitespace of the line `offset` sits on, or "" if code precedes it. */
function indentAt(source: string, offset: number): string {
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
  const prefix = source.slice(lineStart, offset);
  return /^[\t ]*$/.test(prefix) ? prefix : "";
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A double-quoted string literal with nothing an attribute value must escape. */
function plainDoubleQuoted(raw: string | undefined): raw is string {
  return raw !== undefined && /^"[^"\\\n]*"$/.test(raw);
}

// ---------------------------------------------------------------------------
// Attribute → child element
// ---------------------------------------------------------------------------

/** The `{ … }` expression tag of an attribute, or undefined for other shapes. */
function expressionTag(attribute: Record<string, unknown>): Node | undefined {
  const value = attribute["value"];
  const nodes = Array.isArray(value) ? value : [value];
  if (nodes.length !== 1) return undefined;
  const only: unknown = nodes[0];
  return isNode(only) && only.type === "ExpressionTag" ? only : undefined;
}

/** The single quoted-text value of an attribute, or undefined. */
function textValue(attribute: Record<string, unknown>): Node | undefined {
  const value = attribute["value"];
  if (!Array.isArray(value) || value.length !== 1) return undefined;
  const only: unknown = value[0];
  return isNode(only) && only.type === "Text" ? only : undefined;
}

/**
 * Attributes for a flat prop bag whose value is an object literal made only of
 * plain `key: value` properties.
 *
 * Anything else — shorthand, spread, computed keys, methods, getters, a
 * non-identifier key — falls back to `{...expr}` rather than being partially
 * expanded. Both forms are correct; expansion only exists so the common
 * `labs={{ title: "Sales" }}` migrates to code a human would have written.
 */
function expandObjectLiteral(source: string, expression: unknown): string | undefined {
  if (!isRecord(expression) || expression["type"] !== "ObjectExpression") return undefined;
  const properties = expression["properties"];
  if (!Array.isArray(properties) || properties.length === 0) return undefined;

  const parts: string[] = [];
  for (const raw of properties) {
    if (!isRecord(raw) || raw["type"] !== "Property") return undefined;
    const property = raw as unknown as EsProperty;
    if (property.kind !== "init" || property.computed || property.method || property.shorthand) {
      return undefined;
    }
    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal" && typeof property.key.value === "string"
          ? property.key.value
          : undefined;
    if (key === undefined || !IDENTIFIER.test(key)) return undefined;

    const valueSource = source.slice(property.value.start, property.value.end);
    parts.push(
      property.value.type === "Literal" && plainDoubleQuoted(property.value.raw)
        ? `${key}=${valueSource}`
        : `${key}={${valueSource}}`,
    );
  }
  return parts.join(" ");
}

/**
 * Build the replacement child for one deprecated attribute.
 *
 * @returns the element source, or a skip reason when the shape is one the
 * codemod refuses to guess at.
 */
function childFor(
  source: string,
  prop: string,
  rule: PropRule,
  attribute: Record<string, unknown>,
): { element: string } | { skip: string } {
  const tag = expressionTag(attribute);
  const text = textValue(attribute);

  if (rule.form === "theme") {
    if (text !== undefined) {
      return { element: `<Theme name="${source.slice(text.start, text.end)}" />` };
    }
    if (tag !== undefined) {
      const expression = (tag as unknown as Record<string, unknown>)["expression"];
      if (
        isRecord(expression) &&
        expression["type"] === "Literal" &&
        typeof expression["value"] === "string"
      ) {
        return { element: `<Theme name="${expression["value"]}" />` };
      }
    }
    return {
      skip: "theme is ThemeName | ThemeSpec and <Theme> has no `value` hatch, so only a string literal can be rewritten mechanically",
    };
  }

  if (text !== undefined) {
    const quoted = `"${source.slice(text.start, text.end)}"`;
    return rule.form === "value"
      ? { element: `<${rule.component} value=${quoted} />` }
      : { skip: `${prop} is an object-valued prop, so a quoted string is not a shape it can hold` };
  }

  if (tag === undefined) {
    return { skip: `${prop} has no single expression value to move onto <${rule.component}>` };
  }

  const inner = source.slice(tag.start + 1, tag.end - 1);
  if (rule.form === "value") {
    return { element: `<${rule.component} value={${inner}} />` };
  }

  const expanded = expandObjectLiteral(
    source,
    (tag as unknown as Record<string, unknown>)["expression"],
  );
  return {
    element:
      expanded === undefined
        ? `<${rule.component} {...${inner}} />`
        : `<${rule.component} ${expanded} />`,
  };
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

interface ImportSite {
  /** Named specifiers, in source order. */
  readonly specifiers: { readonly local: string; readonly start: number; readonly end: number }[];
}

/**
 * The named-import statement that brought ggsvelte's `GGPlot` into scope.
 *
 * Scoped by module specifier on purpose: a `GGPlot` imported from a consumer's
 * own `./local.js` is somebody else's component, and rewriting its props would
 * be exactly the wrong-rewrite blast radius ADR 0013 weighs. `sources` exists
 * so this repo can still migrate its own files, which import the package
 * through relative paths because the workspace has no self-link.
 */
function findGGPlotImport(program: unknown, sources: readonly string[]): ImportSite | undefined {
  if (!isRecord(program)) return undefined;
  const body = program["body"];
  if (!Array.isArray(body)) return undefined;

  for (const statement of body) {
    if (!isRecord(statement) || statement["type"] !== "ImportDeclaration") continue;
    const source = statement["source"];
    if (!isRecord(source) || typeof source["value"] !== "string") continue;
    if (!sources.includes(source["value"])) continue;
    const rawSpecifiers = statement["specifiers"];
    if (!Array.isArray(rawSpecifiers)) continue;

    const specifiers: ImportSite["specifiers"] = [];
    let hasGGPlot = false;
    for (const specifier of rawSpecifiers) {
      if (!isRecord(specifier) || specifier["type"] !== "ImportSpecifier") continue;
      const local = specifier["local"];
      const imported = specifier["imported"];
      if (!isNode(specifier) || !isRecord(local) || typeof local["name"] !== "string") continue;
      if (isRecord(imported) && imported["name"] === "GGPlot") hasGGPlot = true;
      specifiers.push({ local: local["name"], start: specifier.start, end: specifier.end });
    }
    if (hasGGPlot && specifiers.length > 0) return { specifiers };
  }
  return undefined;
}

function isSortedCaseInsensitive(names: readonly string[]): boolean {
  for (let i = 1; i < names.length; i += 1) {
    if (names[i - 1]!.toLowerCase() > names[i]!.toLowerCase()) return false;
  }
  return true;
}

/**
 * Edits that add `additions` to an existing named-import list.
 *
 * Sorted lists stay sorted (case-insensitively — the repo's own convention,
 * e.g. `{ coordFixed, GGPlot, GeomLine }`); an unsorted list is appended to,
 * so the codemod never reorders a line the author arranged deliberately.
 */
function importEdits(site: ImportSite, additions: readonly string[]): Edit[] {
  const existing = site.specifiers.map((specifier) => specifier.local);
  const missing = additions.filter((name) => !existing.includes(name));
  if (missing.length === 0) return [];

  const last = site.specifiers.at(-1)!;
  if (!isSortedCaseInsensitive(existing)) {
    return [{ start: last.end, end: last.end, text: missing.map((n) => `, ${n}`).join("") }];
  }

  const edits: Edit[] = [];
  for (const name of missing) {
    const before = site.specifiers.find(
      (specifier) => specifier.local.toLowerCase() > name.toLowerCase(),
    );
    edits.push(
      before === undefined
        ? { start: last.end, end: last.end, text: `, ${name}` }
        : { start: before.start, end: before.start, text: `${name}, ` },
    );
  }
  return edits;
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Rewrite deprecated `<GGPlot>` grammar props into child layers.
 *
 * Returns the source unchanged (and no changes) when the file imports no
 * `GGPlot`, uses none of the deprecated props, or only uses shapes the
 * codemod refuses to guess at — the second run of any file is therefore a
 * no-op, which is ADR 0013's idempotence criterion.
 */
export function migratePlotProps(source: string, options: MigrateOptions = {}): MigrationResult {
  const sources = [PACKAGE_SPECIFIER, ...(options.sources ?? [])];
  const ast = parse(source, { modern: true });
  const importSite =
    findGGPlotImport(isRecord(ast.instance) ? ast.instance["content"] : undefined, sources) ??
    findGGPlotImport(isRecord(ast.module) ? ast.module["content"] : undefined, sources);
  if (importSite === undefined) return { code: source, changes: [], skipped: [] };

  const localName = importSite.specifiers.find((specifier) => {
    // The local name for the GGPlot binding: re-derived here so `import
    // { GGPlot as Plot }` rewrites <Plot> rather than silently doing nothing.
    return specifier.local === "GGPlot";
  })?.local;
  const plotName = localName ?? aliasedGGPlotName(source, importSite);
  if (plotName === undefined) return { code: source, changes: [], skipped: [] };

  const edits: Edit[] = [];
  const changes: PropChange[] = [];
  const skipped: PropSkip[] = [];
  const needed = new Set<string>();

  for (const element of collectComponents(ast.fragment, plotName)) {
    const attributes = Array.isArray(element["attributes"]) ? element["attributes"] : [];
    const elementStart = (element as unknown as Node).start;
    const elementEnd = (element as unknown as Node).end;

    const children: string[] = [];
    let previousEnd = elementStart + 1 + plotName.length;

    for (const raw of attributes) {
      if (!isRecord(raw) || !isNode(raw)) continue;
      const attributeEnd = raw.end;
      const attributeStart = raw.start;
      const name = raw["name"];
      if (raw["type"] !== "Attribute" || typeof name !== "string") {
        previousEnd = attributeEnd;
        continue;
      }
      // Own keys only — plain RULES[name] walks Object.prototype and would
      // treat constructor/toString/… as migratable (truthy functions), then
      // emit <undefined …/> and an import of undefined under --write.
      const rule = Object.hasOwn(RULES, name) ? RULES[name] : undefined;
      if (rule === undefined) {
        previousEnd = attributeEnd;
        continue;
      }

      const built = childFor(source, name, rule, raw);
      if ("skip" in built) {
        skipped.push({
          prop: name,
          line: lineOf(source, attributeStart),
          reason: built.skip,
          docUrl: rule.docUrl,
        });
        previousEnd = attributeEnd;
        continue;
      }

      children.push(built.element);
      needed.add(rule.component);
      changes.push({
        prop: name,
        component: rule.component,
        line: lineOf(source, attributeStart),
      });
      // Swallow the whitespace that separated this attribute from the last
      // surviving one, so removing a middle attribute does not leave a double
      // space and removing the last does not leave a trailing one.
      edits.push({ start: previousEnd, end: attributeEnd, text: "" });
      previousEnd = attributeEnd;
    }

    if (children.length === 0) continue;

    const fragmentNodes = Array.isArray(element["fragment"])
      ? []
      : isRecord(element["fragment"]) && Array.isArray(element["fragment"]["nodes"])
        ? (element["fragment"]["nodes"] as unknown[])
        : [];
    const firstChild = fragmentNodes.find((node) => isNode(node));
    const elementIndent = indentAt(source, elementStart);
    const childIndent = `${elementIndent}  `;
    const block = children.map((child) => `\n${childIndent}${child}`).join("");

    if (firstChild === undefined) {
      // Self-closing `<GGPlot … />`: grow a body. previousEnd is the end of the
      // last attribute, so this also removes the ` /` before the `>`.
      edits.push({
        start: previousEnd,
        end: elementEnd,
        text: `>${block}\n${elementIndent}</${plotName}>`,
      });
    } else {
      edits.push({ start: firstChild.start, end: firstChild.start, text: block });
    }
  }

  if (changes.length === 0) return { code: source, changes: [], skipped };

  edits.push(...importEdits(importSite, [...needed].toSorted()));
  return { code: applyEdits(source, edits), changes, skipped };
}

/** Local name of an aliased `import { GGPlot as X }`, read back from source. */
function aliasedGGPlotName(source: string, site: ImportSite): string | undefined {
  for (const specifier of site.specifiers) {
    const text = source.slice(specifier.start, specifier.end);
    if (/^GGPlot\s+as\s+/.test(text)) return specifier.local;
  }
  return undefined;
}

/** Every `<plotName>` component in the template, including nested ones. */
function collectComponents(fragment: unknown, plotName: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const walk = (node: unknown): void => {
    if (!isRecord(node)) return;
    if (node["type"] === "Component" && node["name"] === plotName) found.push(node);
    for (const child of childObjects(node)) walk(child);
  };
  walk(fragment);
  return found;
}
