/**
 * CI path routing — git text parsing for changed-path lists. Pure; no git
 * invocation (process IO lives in detect-changes / cli modules).
 */

export function parseFileList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Parse `git diff --name-status` stdout into every path involved, including
 * both sides of renames/copies. `--name-only` drops the source path of a
 * rename, so a move out of `packages/svelte/**` into docs could skip package
 * jobs while the package file was effectively removed.
 */
export function parseNameStatusList(text: string): string[] {
  const paths: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trimEnd();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    // status\tpath  OR  R100\told\tnew  OR  C100\told\tnew
    const parts = trimmed.split("\t");
    if (parts.length < 2) continue;
    const status = parts[0] ?? "";
    if (status.startsWith("R") || status.startsWith("C")) {
      const from = parts[1];
      const to = parts[2];
      if (from !== undefined && from.length > 0) paths.push(from);
      if (to !== undefined && to.length > 0) paths.push(to);
      continue;
    }
    const path = parts[1];
    if (path !== undefined && path.length > 0) paths.push(path);
  }
  return [...new Set(paths)];
}
