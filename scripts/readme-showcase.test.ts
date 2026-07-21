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

function readmeExamples(): readonly ReadmeExample[] {
  return [
    ...readme.matchAll(/<!-- example-source: ([^ ]+) -->\n\n```svelte\n([\s\S]*?)\n```/g),
  ].map(([, id, source]) => ({ id, source }));
}

function linkedPreviews(): ReadonlyMap<string, string> {
  return new Map(
    [
      ...readme.matchAll(
        /\[!\[[^\]]+\]\((apps\/docs\/static\/previews\/[^)]+)\)\]\(https:\/\/ggsvelte\.sh\/examples\/([^)]+)\)/g,
      ),
    ].map(([, path, id]) => [id, path]),
  );
}

describe("README visual showcase", () => {
  it("shows broad example range through trusted generated previews", () => {
    const examples = readmeExamples();
    const previews = linkedPreviews();
    const categories = new Set(examples.map(({ id }) => id.split("/")[0]));

    expect(examples.length).toBeGreaterThanOrEqual(8);
    expect(new Set(examples.map(({ id }) => id)).size).toBe(examples.length);
    expect(categories.size).toBeGreaterThanOrEqual(8);
    expect([...previews.keys()].toSorted()).toEqual(examples.map(({ id }) => id).toSorted());

    const generatedById = new Map(GALLERY_PREVIEWS.map((preview) => [preview.id, preview]));
    for (const [id, path] of previews) {
      const generated = generatedById.get(id);
      expect(generated, `${id} must have a generated gallery preview`).toBeDefined();
      expect(path).toBe(`apps/docs/static${generated?.path}`);
      expect(existsSync(join(root, path))).toBe(true);
    }
  });

  it("keeps every showcased snippet identical to its real Svelte example", () => {
    for (const { id, source } of readmeExamples()) {
      const exampleSource = readFileSync(join(root, "examples", id, "Example.svelte"), "utf8");
      expect(source.trim(), id).toBe(exampleSource.trim());
      expect(source).toContain('from "@ggsvelte/svelte"');
      expect(source).toContain("<GGPlot");
      expect(source).not.toContain('from "@ggsvelte/spec"');
      expect(source).not.toContain('from "@ggsvelte/core"');
    }
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
