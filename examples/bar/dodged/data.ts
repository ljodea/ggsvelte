/**
 * US beer production by package type for a dodged-bar demo.
 *
 * Re-exported from the bundled beerProduction table so the example, the
 * package data export, and the docs JSON asset stay one table. Import the
 * source module (not `@ggsvelte/svelte/data`) so `check:scripts` typechecks
 * before packages/svelte dist is built.
 *
 * Source: US TTB national totals via TidyTuesday 2020-03-31. See NOTICE and
 * BEER_PRODUCTION_CITATION in @ggsvelte/svelte/data.
 */
export { beerProduction } from "../../../packages/svelte/src/lib/data/beer-production.js";
