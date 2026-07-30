import { describe, expect, it } from "bun:test";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { GALLERY_PREVIEWS } from "../apps/docs/src/lib/generated/gallery-previews.ts";

const root = join(import.meta.dir, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const svelteReadme = readFileSync(join(root, "packages/svelte/README.md"), "utf8");

interface ReadmeExample {
  readonly id: string;
  readonly source: string;
}

/**
 * Both capture groups are mandatory in the pattern, so a match always carries
 * them — but only at runtime. Assert it rather than coercing: a group that came
 * back undefined would otherwise flow into `join(root, "examples", id, …)` and
 * surface as an unrelated ENOENT several assertions later.
 */
function bothCaptures(match: RegExpExecArray): readonly [string, string] {
  const [, first, second] = match;
  if (first === undefined || second === undefined) {
    throw new Error(`Malformed README.md block, expected two captures: ${match[0]}`);
  }
  return [first, second];
}

/**
 * README snippets are the GitHub front door; the corpus files are the VR
 * matrix's render targets. VR needs explicit `width`/`height` on `<GGPlot>`,
 * the front door does not (omitted width is container-responsive, omitted
 * height defaults to 400) — so snippets drop the root size props and this
 * comparison strips them from the corpus side before checking sync. The
 * strip is scoped to the root `<GGPlot` open tag (an unindented `<GGPlot`
 * line through its closing `>`): size props on geoms or nested plots — even
 * when prettier wraps them onto their own line, as in
 * `examples/errorbar/summary-bin` — must still appear in README snippets.
 */
function stripRootSizeProps(source: string): string {
  const sizeAttribute = /^\s*(?:width|height)=(?:\{[^}]*\}|"[^"]*")$/;
  const out: string[] = [];
  let inRootOpenTag = false;
  for (const line of source.split("\n")) {
    if (line === "<GGPlot") {
      inRootOpenTag = true;
    } else if (inRootOpenTag) {
      if (sizeAttribute.test(line)) continue;
      if (line.trimEnd().endsWith(">")) inRootOpenTag = false;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Whitespace-insensitive form: prettier may fold a `<GGPlot …>` open tag onto
 * one line once the size props are gone, while the corpus keeps it multi-line.
 */
function normalizeSnippet(source: string): string {
  return source
    .replaceAll(/\s+/g, " ")
    .replaceAll(/\s(\/?>)/g, "$1")
    .trim();
}

function readmeExamples(): readonly ReadmeExample[] {
  return [
    ...readme.matchAll(/<!-- example-source: ([^ ]+) -->\n\n```svelte\n([\s\S]*?)\n```/g),
  ].map((match) => {
    const [id, source] = bothCaptures(match);
    return { id, source };
  });
}

function linkedPreviews(): ReadonlyMap<string, string> {
  return new Map(
    [
      ...readme.matchAll(
        /\[!\[[^\]]+\]\((apps\/docs\/static\/previews\/[^)]+)\)\]\(https:\/\/ggsvelte\.sh\/examples\/([^)]+)\)/g,
      ),
    ].map((match) => {
      const [path, id] = bothCaptures(match);
      return [id, path] as const;
    }),
  );
}

describe("stripRootSizeProps", () => {
  it("strips size props from the root GGPlot open tag only", () => {
    const fixture = [
      "<GGPlot",
      "  data={rows}",
      "  width={640}",
      "  height={400}",
      ">",
      "  <GeomErrorbar",
      '    stat="summary_bin"',
      "    width={0.35}",
      "    linewidth={1.4}",
      "  />",
      "  <GGPlot",
      "    data={inner}",
      "    width={320}",
      "  >",
      "    <GeomPoint />",
      "  </GGPlot>",
      "</GGPlot>",
    ].join("\n");

    const stripped = stripRootSizeProps(fixture);
    expect(stripped).not.toContain("width={640}");
    expect(stripped).not.toContain("height={400}");
    expect(stripped).toContain("width={0.35}");
    expect(stripped).toContain("width={320}");
  });
});

describe("README visual showcase", () => {
  it("shows broad example range through trusted generated previews", () => {
    const examples = readmeExamples();
    const previews = linkedPreviews();
    const categories = new Set(examples.map(({ id }) => id.split("/")[0]));

    expect(examples.length).toBeGreaterThanOrEqual(8);
    expect(new Set(examples.map(({ id }) => id)).size).toBe(examples.length);
    expect(categories.size).toBeGreaterThanOrEqual(8);
    expect([...previews.keys()].toSorted()).toEqual(examples.map(({ id }) => id).toSorted());

    // Keyed by string, not by the generated literal union: the lookup key comes
    // out of the README, and "this id has no generated preview" is the failure
    // this loop is here to report.
    const generatedById = new Map<string, (typeof GALLERY_PREVIEWS)[number]>(
      GALLERY_PREVIEWS.map((preview) => [preview.id, preview]),
    );
    for (const [id, path] of previews) {
      const generated = generatedById.get(id);
      expect(generated, `${id} must have a generated gallery preview`).toBeDefined();
      expect(path).toBe(`apps/docs/static${generated?.path}`);
      expect(existsSync(join(root, path))).toBe(true);
    }
  });

  it("keeps every showcased snippet in sync with its real Svelte example, minus size props", () => {
    for (const { id, source } of readmeExamples()) {
      const exampleSource = readFileSync(join(root, "examples", id, "Example.svelte"), "utf8");
      expect(normalizeSnippet(source), id).toBe(
        normalizeSnippet(stripRootSizeProps(exampleSource)),
      );
      expect(source).toContain('from "@ggsvelte/svelte"');
      expect(source).toContain("<GGPlot");
      expect(source).not.toContain('from "@ggsvelte/spec"');
      expect(source).not.toContain('from "@ggsvelte/core"');
    }
  });

  it("keeps controller plumbing off the front door", () => {
    // createPlotInteraction / interactionScope are the cross-plot
    // coordination API. A static showcase chart never needs them — a
    // snippet that carries them is teaching boilerplate as if required.
    for (const { id, source } of readmeExamples()) {
      expect(source, id).not.toContain("createPlotInteraction");
      expect(source, id).not.toContain("interactionScope");
    }
    expect(svelteReadme).not.toContain("createPlotInteraction");
    expect(svelteReadme).not.toContain("interactionScope");
  });

  it("uses no TypeScript, builder, or PortableSpec snippets on the GitHub front door", () => {
    const fenceLanguages = [...readme.matchAll(/^```([^\n]*)$/gm)].map(([, language]) => language);

    expect(
      fenceLanguages.every(
        (language) => language === "" || language === "svelte" || language === "sh",
      ),
    ).toBe(true);
    expect(readme).not.toContain("```ts");
    expect(readme).not.toContain("```json");
    expect(readme).not.toContain("https://ljodea.github.io/ggsvelte");
  });

  it("keeps the primary package README on the Svelte component path", () => {
    const fenceLanguages = [...svelteReadme.matchAll(/^```([^\n]*)$/gm)].map(
      ([, language]) => language,
    );

    expect(
      fenceLanguages.every(
        (language) => language === "" || language === "svelte" || language === "sh",
      ),
    ).toBe(true);
    expect(svelteReadme).toContain('from "@ggsvelte/svelte"');
    expect(svelteReadme).toContain("<GGPlot");
    expect(svelteReadme).not.toContain("const spec =");
    expect(svelteReadme).not.toContain("const built =");
    expect(svelteReadme).not.toContain("```ts");
  });
});
