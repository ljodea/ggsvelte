const DOCS_BUILD_MODES = [
  "dev",
  "legacy-full",
  "cloudflare-preview",
  "cloudflare-production",
  "legacy-migration",
] as const;

type DocsBuildMode = (typeof DOCS_BUILD_MODES)[number];

export interface DocsBuildConfig {
  mode: DocsBuildMode;
  base: "" | "/ggsvelte";
  canonicalBase: "https://ggsvelte.sh" | "https://ljodea.github.io/ggsvelte";
  indexable: boolean;
  analytics: boolean;
}

export interface DocsBuildInput {
  mode?: string;
  basePath?: string;
}

const VALID_COMBINATIONS = [
  "dev + no BASE_PATH",
  "legacy-full + BASE_PATH=/ggsvelte",
  "cloudflare-preview + no BASE_PATH",
  "cloudflare-production + no BASE_PATH",
  "legacy-migration + BASE_PATH=/ggsvelte",
].join("; ");

function invalid(input: DocsBuildInput): never {
  const mode = input.mode ?? "(unset)";
  const basePath = input.basePath ?? "(unset)";
  throw new Error(
    `Invalid docs build configuration: DOCS_BUILD_MODE=${mode}, BASE_PATH=${basePath}. Valid combinations: ${VALID_COMBINATIONS}.`,
  );
}

export function resolveDocsBuildConfig(input: DocsBuildInput): DocsBuildConfig {
  const mode = input.mode ?? "dev";
  const basePath = input.basePath;

  if (mode === "dev" && basePath === undefined) {
    return {
      mode,
      base: "",
      canonicalBase: "https://ggsvelte.sh",
      indexable: false,
      analytics: false,
    };
  }
  if (mode === "legacy-full" && basePath === "/ggsvelte") {
    return {
      mode,
      base: "/ggsvelte",
      canonicalBase: "https://ljodea.github.io/ggsvelte",
      indexable: true,
      analytics: false,
    };
  }
  if (mode === "cloudflare-preview" && basePath === undefined) {
    return {
      mode,
      base: "",
      canonicalBase: "https://ggsvelte.sh",
      indexable: false,
      analytics: false,
    };
  }
  if (mode === "cloudflare-production" && basePath === undefined) {
    return {
      mode,
      base: "",
      canonicalBase: "https://ggsvelte.sh",
      indexable: true,
      analytics: true,
    };
  }
  if (mode === "legacy-migration" && basePath === "/ggsvelte") {
    return {
      mode,
      base: "/ggsvelte",
      canonicalBase: "https://ggsvelte.sh",
      indexable: false,
      analytics: false,
    };
  }

  return invalid(input);
}
