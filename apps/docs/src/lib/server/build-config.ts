import { env } from "$env/dynamic/private";

import { resolveDocsBuildConfig } from "../../../build-mode";

export function docsBuildConfig() {
  const mode = env["DOCS_BUILD_MODE"];
  const basePath = env["BASE_PATH"];
  const analyticsToken = env["DOCS_ANALYTICS_TOKEN"];
  return resolveDocsBuildConfig({
    ...(mode !== undefined && { mode }),
    ...(basePath !== undefined && { basePath }),
    ...(analyticsToken !== undefined && { analyticsToken }),
  });
}
