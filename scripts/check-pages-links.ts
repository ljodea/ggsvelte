/** Verify that the packed static docs contain their required surfaces and links. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { posix, resolve } from "node:path";

export const requiredPages = [
  "guide/interactions.html",
  "guide/migrating-pre-0-1.html",
  "examples/interaction/tooltip.html",
  "examples/interaction/brush-zoom.html",
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
  const problems = requiredPages
    .filter((page) => !files.has(page))
    .map((page) => `missing required page: ${page}`);

  for (const sourcePath of files) {
    if (!sourcePath.endsWith(".html")) continue;
    const html = readFileSync(resolve(buildDirectory, sourcePath), "utf8");
    const hrefs = [...html.matchAll(/\bhref=(?:"([^"]*)"|'([^']*)')/gi)].map(
      (match) => match[1] ?? match[2] ?? "",
    );
    for (const href of findBrokenLinks(sourcePath, hrefs, files)) {
      problems.push(`${sourcePath}: broken href ${JSON.stringify(href)}`);
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
