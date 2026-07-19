import { canonicalUrl, findDocsRoute, guideSequence, routePath } from "$lib/routes";
import { docsBuildConfig } from "$lib/server/build-config";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ url }) => {
  const config = docsBuildConfig();
  const path = routePath(url.pathname, config.base);
  const route = findDocsRoute(path);
  return {
    site: config,
    path,
    route,
    canonical: route === undefined ? undefined : canonicalUrl(route, config.canonicalBase),
    sequence: guideSequence(path),
  };
};
