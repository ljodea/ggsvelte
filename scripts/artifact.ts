/**
 * Shared generated-artifact protocol (#783).
 *
 * One check/write/CLI seam for committed generator output. Generators keep
 * domain `build()` logic; this module owns MISSING/STALE messaging, byte
 * comparison, optional dependency attribution, and oxfmt for TS projections.
 *
 * dependsOn semantics (static-import safe):
 * - check(): run deps first; failures attribute the true cause via `because`
 * - write(): require deps already current; refuse to cascade in-process
 *   (module-graph bindings would still see stale imports)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { format } from "oxfmt";

export type ArtifactStatus = "MISSING" | "STALE";

const REPO_ROOT = resolve(import.meta.dir, "..");

export class ArtifactError extends Error {
  readonly status: ArtifactStatus;
  readonly artifactPath: string;
  readonly regenerateWith: string;
  readonly because?: ArtifactError;

  constructor(opts: {
    status: ArtifactStatus;
    path: string;
    regenerateWith: string;
    label: string;
    because?: ArtifactError;
  }) {
    const fix = `Run: bun run ${opts.regenerateWith}`;
    let message: string;
    if (opts.because) {
      message =
        `${opts.label} is ${opts.status} because ${labelOf(opts.because)} is ${opts.because.status}. ` +
        `Run: bun run ${opts.because.regenerateWith}` +
        (opts.because.regenerateWith === opts.regenerateWith
          ? "."
          : ` (then bun run ${opts.regenerateWith}).`);
    } else {
      message = `${opts.label} is ${opts.status}. ${fix}`;
    }
    super(message);
    this.name = "ArtifactError";
    this.status = opts.status;
    this.artifactPath = opts.path;
    this.regenerateWith = opts.regenerateWith;
    if (opts.because !== undefined) this.because = opts.because;
  }
}

function labelOf(error: ArtifactError): string {
  // Message starts with "<label> is STATUS..."
  const match = /^(.*?) is (?:MISSING|STALE)/.exec(error.message);
  return match?.[1] ?? error.artifactPath;
}

export type ArtifactDef = {
  /** Absolute path to the committed artifact file. */
  path: string;
  /** Fresh bytes (caller formats if needed; see formatGeneratedSource). */
  build: () => string | Promise<string>;
  /** npm script name for fix messages, e.g. "docs:routes:gen". */
  regenerateWith: string;
  /** Optional label for messages; defaults to repo-relative path. */
  label?: string;
  /**
   * Artifacts that must be current before this build is meaningful.
   * check()/write() verify dependencies first; write does not cascade.
   */
  dependsOn?: readonly Artifact[];
};

export type Artifact = {
  readonly path: string;
  readonly regenerateWith: string;
  readonly label: string;
  check(): Promise<void>;
  write(): Promise<{ wrote: boolean }>;
  cli(argv?: readonly string[]): Promise<void>;
};

function defaultLabel(path: string): string {
  const rel = relative(REPO_ROOT, path);
  return rel === "" || rel.startsWith("..") ? path : rel;
}

async function ensureDepsCurrent(deps: readonly Artifact[] | undefined): Promise<void> {
  if (deps === undefined) return;
  for (const dep of deps) {
    await dep.check();
  }
}

function wrapDepFailure(
  error: unknown,
  self: { path: string; regenerateWith: string; label: string },
): never {
  if (error instanceof ArtifactError) {
    throw new ArtifactError({
      status: error.status,
      path: self.path,
      regenerateWith: self.regenerateWith,
      label: self.label,
      because: error.because ?? error,
    });
  }
  throw error;
}

export function defineArtifact(def: ArtifactDef): Artifact {
  const label = def.label ?? defaultLabel(def.path);
  const self = {
    path: def.path,
    regenerateWith: def.regenerateWith,
    label,
  };

  async function check(): Promise<void> {
    try {
      await ensureDepsCurrent(def.dependsOn);
    } catch (error) {
      wrapDepFailure(error, self);
    }
    const fresh = await def.build();
    if (!existsSync(def.path)) {
      throw new ArtifactError({
        status: "MISSING",
        path: def.path,
        regenerateWith: def.regenerateWith,
        label,
      });
    }
    const current = readFileSync(def.path, "utf8");
    if (current !== fresh) {
      throw new ArtifactError({
        status: "STALE",
        path: def.path,
        regenerateWith: def.regenerateWith,
        label,
      });
    }
  }

  async function write(): Promise<{ wrote: boolean }> {
    try {
      await ensureDepsCurrent(def.dependsOn);
    } catch (error) {
      wrapDepFailure(error, self);
    }
    const fresh = await def.build();
    if (existsSync(def.path) && readFileSync(def.path, "utf8") === fresh) {
      return { wrote: false };
    }
    mkdirSync(dirname(def.path), { recursive: true });
    writeFileSync(def.path, fresh);
    return { wrote: true };
  }

  async function cli(argv: readonly string[] = process.argv): Promise<void> {
    const checkMode = argv.includes("--check");
    try {
      if (checkMode) {
        await check();
        console.log(`${label} is current.`);
        return;
      }
      const { wrote } = await write();
      console.log(wrote ? `Wrote ${label}.` : `${label} already current.`);
    } catch (error) {
      if (error instanceof ArtifactError) {
        console.error(error.message);
        process.exit(1);
      }
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  return {
    path: def.path,
    regenerateWith: def.regenerateWith,
    label,
    check,
    write,
    cli,
  };
}

export type ArtifactGroupDef = {
  regenerateWith: string;
  members: readonly Artifact[];
  /** Extra check after all members pass (orphan sweeps, provenance, digests). */
  extraCheck?: () => void | Promise<void>;
  /** Extra write after members write (PNG copy, provenance prune, dir wipe). */
  extraWrite?: () => void | Promise<void>;
};

export type ArtifactGroup = {
  check(): Promise<void>;
  write(): Promise<void>;
  cli(argv?: readonly string[]): Promise<void>;
};

export function defineArtifactGroup(def: ArtifactGroupDef): ArtifactGroup {
  async function check(): Promise<void> {
    for (const member of def.members) {
      await member.check();
    }
    await def.extraCheck?.();
  }

  async function write(): Promise<void> {
    for (const member of def.members) {
      await member.write();
    }
    await def.extraWrite?.();
  }

  async function cli(argv: readonly string[] = process.argv): Promise<void> {
    const checkMode = argv.includes("--check");
    try {
      if (checkMode) {
        await check();
        console.log(`${def.regenerateWith.replace(/:gen$/, "")} artifacts are current.`);
        return;
      }
      await write();
      console.log(`${def.regenerateWith.replace(/:gen$/, "")} artifacts generated.`);
    } catch (error) {
      if (error instanceof ArtifactError) {
        console.error(error.message);
        process.exit(1);
      }
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  return { check, write, cli };
}

/** oxfmt helper used by TS projections (uniform format errors). */
export async function formatGeneratedSource(path: string, source: string): Promise<string> {
  const result = await format(path, source);
  if (result.errors.length > 0) {
    throw new Error(
      `Could not format generated source for ${path}: ${result.errors[0]?.message ?? "unknown error"}`,
    );
  }
  return result.code;
}
