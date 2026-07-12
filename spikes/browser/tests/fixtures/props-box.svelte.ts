/** Runes helper for .test.ts files (which are not compiled by svelte). */
export function stateBox<T extends Record<string, unknown>>(initial: T): T {
	const box = $state(initial);
	return box;
}
