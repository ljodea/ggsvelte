/** Verify that the packed static docs contain their required surfaces and links. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { posix, resolve } from "node:path";

export const requiredPages = [
  "guide/interactions.html",
  "guide/interaction-reference.html",
  "guide/migrating-pre-0-1.html",
  "playground.html",
  "reference/interactions.html",
  "examples/interaction/tooltip.html",
  "examples/interaction/brush-zoom.html",
  "examples/interaction/linked-views.html",
  "examples/interactions/inspection.html",
  "examples/interactions/interval-selection.html",
  "llms.txt",
  "llms-full.txt",
] as const;

const PROJECT_BASE = "/ggsvelte";
const EXTERNAL_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;

function candidates(path: string): string[] {
  if (path === "" || path === "." || path === "./") return ["index.html"];
  if (path.endsWith("/")) return [`${path}index.html`];
  if (posix.extname(path) !== "") return [path];
  return [path, `${path}.html`, `${path}/index.html`];
}

function targetPath(sourcePath: string, href: string): string | null {
  const clean = href.split("#", 1)[0]?.split("?", 1)[0] ?? "";
  if (clean === "" || clean.startsWith("#") || clean.startsWith("//")) return null;
  if (EXTERNAL_PROTOCOL.test(clean)) return null;

  if (clean.startsWith("/")) {
    const withoutBase = clean === PROJECT_BASE ? "/" : clean.replace(`${PROJECT_BASE}/`, "/");
    return posix.normalize(withoutBase.replace(/^\/+/, ""));
  }
  return posix.normalize(posix.join(posix.dirname(sourcePath), clean));
}

/** Return the original hrefs whose internal packed targets do not exist. */
export function findBrokenLinks(
  sourcePath: string,
  hrefs: readonly string[],
  files: ReadonlySet<string>,
): string[] {
  return hrefs.filter((href) => {
    const target = targetPath(sourcePath, href);
    return target !== null && !candidates(target).some((candidate) => files.has(candidate));
  });
}

/** Return internal hrefs whose target exists but whose fragment id does not. */
export function findBrokenFragments(
  sourcePath: string,
  hrefs: readonly string[],
  files: ReadonlySet<string>,
  anchors: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  return hrefs.filter((href) => {
    const hashIndex = href.indexOf("#");
    if (hashIndex < 0 || hashIndex === href.length - 1) return false;
    const beforeHash = href.slice(0, hashIndex);
    if (beforeHash.startsWith("//") || EXTERNAL_PROTOCOL.test(beforeHash)) return false;

    let fragment: string;
    try {
      fragment = decodeURIComponent(href.slice(hashIndex + 1));
    } catch {
      return true;
    }
    const target = beforeHash === "" ? sourcePath : targetPath(sourcePath, beforeHash);
    if (target === null) return false;
    const page = candidates(target).find((candidate) => files.has(candidate));
    if (page === undefined || !page.endsWith(".html")) return false;
    return !(anchors.get(page)?.has(fragment) ?? false);
  });
}

function listFiles(root: string, directory = root): string[] {
  return readdirSync(directory).flatMap((name) => {
    const absolute = resolve(directory, name);
    return statSync(absolute).isDirectory()
      ? listFiles(root, absolute)
      : [posix.normalize(absolute.slice(root.length + 1))];
  });
}

export function checkPackedPages(buildDirectory: string): string[] {
  if (!existsSync(buildDirectory)) return [`packed Pages directory is missing: ${buildDirectory}`];
  const files = new Set(listFiles(buildDirectory));
  const htmlByPath = new Map<string, string>();
  const anchors = new Map<string, ReadonlySet<string>>();
  for (const path of files) {
    if (!path.endsWith(".html")) continue;
    const html = readFileSync(resolve(buildDirectory, path), "utf8");
    htmlByPath.set(path, html);
    anchors.set(
      path,
      new Set(
        [...html.matchAll(/\bid=(?:"([^"]*)"|'([^']*)')/gi)].map(
          (match) => match[1] ?? match[2] ?? "",
        ),
      ),
    );
  }
  const problems = requiredPages
    .filter((page) => !files.has(page))
    .map((page) => `missing required page: ${page}`);

  for (const sourcePath of files) {
    if (!sourcePath.endsWith(".html")) continue;
    const html = htmlByPath.get(sourcePath) ?? "";
    const hrefs = [...html.matchAll(/\bhref=(?:"([^"]*)"|'([^']*)')/gi)].map(
      (match) => match[1] ?? match[2] ?? "",
    );
    for (const href of findBrokenLinks(sourcePath, hrefs, files)) {
      problems.push(`${sourcePath}: broken href ${JSON.stringify(href)}`);
    }
    for (const href of findBrokenFragments(sourcePath, hrefs, files, anchors)) {
      problems.push(`${sourcePath}: broken fragment ${JSON.stringify(href)}`);
    }
  }
  return problems;
}

function main(): void {
  const buildDirectory = resolve(import.meta.dir, "../apps/docs/build");
  const problems = checkPackedPages(buildDirectory);
  if (problems.length > 0) {
    console.error(`Packed Pages link check failed (${String(problems.length)}):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    "Packed Pages includes the interaction journeys, guides, endpoints, and valid links.",
  );
}

if (import.meta.main) main();
