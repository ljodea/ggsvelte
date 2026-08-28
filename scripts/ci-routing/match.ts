/**
 * CI path routing — glob-lite matcher used by lane classification and
 * content-hash input matching (not a full minimatch port).
 * Supports:
 * - exact paths
 * - `dir/**` (directory or any descendant)
 * - single-segment `*` / trailing `*.ext` without `/` in the pattern
 * - `**\/*.md` style suffix matches (any depth)
 */

export function matchPathPattern(pattern: string, filePath: string): boolean {
  const path = filePath.replaceAll("\\", "/");
  const pat = pattern.replaceAll("\\", "/");

  if (pat.startsWith("**/")) {
    const suffix = pat.slice(3);
    if (suffix.includes("*") || suffix.includes("/")) {
      // `**/*.md` → ends with .md at any depth (single extension wildcard only)
      if (suffix.startsWith("*.") && !suffix.slice(2).includes("*") && !suffix.includes("/")) {
        return path.endsWith(suffix.slice(1)) || path.includes(`/${suffix.slice(1)}`);
      }
      return false;
    }
    return path === suffix || path.endsWith(`/${suffix}`);
  }

  if (pat.endsWith("/**")) {
    const prefix = pat.slice(0, -3);
    if (path === prefix) return true;
    return path.startsWith(`${prefix}/`);
  }

  if (pat.includes("*")) {
    // No `**` here (handled above). Each `*` is a single path segment fragment
    // (`[^/]*`), so `.github/workflows/ci-*.yml` matches domain reusable files
    // without treating `*` as a cross-directory wildcard.
    if (pat.includes("**")) return false;
    const re = new RegExp(
      `^${pat
        .split("*")
        .map((part) => escapeRegExp(part))
        .join("[^/]*")}$`,
    );
    return re.test(path);
  }

  return path === pat;
}

function escapeRegExp(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
