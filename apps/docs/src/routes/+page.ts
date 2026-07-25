import { loadExample } from "$lib/examples";

import type { PageLoad } from "./$types";

/** The gallery example the hero renders, and whose source its code tabs show. */
const HERO_EXAMPLE_ID = "point/scatter-color";

/**
 * The hero's three code tabs are the example corpus's own spellings of the
 * chart the hero renders, loaded the way the gallery pages load theirs.
 * Inlining them in the page is what let the tabs drift into showing a
 * different dataset from the plot beside them.
 */
export const load: PageLoad = () => loadExample(HERO_EXAMPLE_ID);
