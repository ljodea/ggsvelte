/**
 * Guide-page registry for the docs site: the markdown comes from
 * scripts/gen-llms.ts (catalog-driven — the same source the llms.txt and
 * llms-full.txt endpoints serve), so guide pages, llms surfaces, and the
 * code's own catalogs cannot drift.
 */
import lifecycle from "$lifecycle";
import type { GuidePage, LifecycleDoc } from "$scripts/gen-llms";
import { guidePages } from "$scripts/gen-llms";

export const GUIDE_PAGES: readonly GuidePage[] = guidePages(lifecycle as unknown as LifecycleDoc);
