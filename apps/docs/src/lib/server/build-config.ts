import { env } from "$env/dynamic/private";

import { resolveDocsBuildConfig } from "../../../build-mode";

export function docsBuildConfig() {
  const mode = env["DOCS_BUILD_MODE"];
  const basePath = env["BASE_PATH"];
  return resolveDocsBuildConfig({
    ...(mode !== undefined && { mode }),
    ...(basePath !== undefined && { basePath }),
  });
}
