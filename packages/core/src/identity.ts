/** Epoch-local reference into an interned semantic-lineage store. */
export type LineageRef = number;

/**
 * Interns source-key memberships once per pipeline epoch. The empty lineage,
 * singleton memberships, and shared derived memberships are all referenced by
 * compact integer ids; renderer indices are never promoted to public keys.
 */
export class LineageStore<Key extends PropertyKey = PropertyKey> {
  readonly empty: LineageRef = 0;
  readonly #members: (readonly Key[])[] = [[]];
  readonly #refs = new Map<string, LineageRef>([["", 0]]);
  readonly #ids = new Map<Key, number>();
  /** Identity cache for frozen shared membership arrays (e.g. smooth finite-y lists). */
  readonly #byArray = new WeakMap<object, LineageRef>();
  /** Direct key → ref index for singleton memberships (one per candidate row). */
  readonly #singletonRefs = new Map<Key, LineageRef>();

  intern(keys: Iterable<Key>): LineageRef {
    // Shared frozen arrays (identity-index buckets) intern once; skip re-sort/tokenize.
    // Look the array up before asking whether it is frozen: `Object.isFrozen`
    // walks the array in this engine, so guarding a hash lookup with it costs
    // one pass over the members per call — the very rescan this cache exists to
    // avoid. Only frozen arrays are ever stored below, and freezing cannot be
    // undone, so a hit is still sound.
    if (Array.isArray(keys)) {
      const cached = this.#byArray.get(keys);
      if (cached !== undefined) return cached;
      // Singleton fast path: identity geoms intern [sourceRow] once per
      // candidate, so the general path's Set + sort + join tokenization ran
      // per mark. One Map hit per repeat; first-seen singletons register in
      // #refs under the same token the general path computes, so a membership
      // keeps ONE ref however it is interned.
      if (keys.length === 1) return this.#internSingleton(keys[0]!);
    }

    const unique: Key[] = [];
    const seen = new Set<Key>();
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(key);
    }
    if (unique.length === 0) return this.empty;
    unique.sort((a, b) => this.#id(a) - this.#id(b));
    const token = unique.map((key) => this.#id(key)).join(",");
    const prior = this.#refs.get(token);
    if (prior !== undefined) {
      if (Array.isArray(keys) && Object.isFrozen(keys)) this.#byArray.set(keys, prior);
      return prior;
    }
    const ref = this.#members.length;
    this.#members.push(Object.freeze(unique));
    this.#refs.set(token, ref);
    if (Array.isArray(keys) && Object.isFrozen(keys)) this.#byArray.set(keys, ref);
    return ref;
  }

  #internSingleton(key: Key): LineageRef {
    const prior = this.#singletonRefs.get(key);
    if (prior !== undefined) return prior;
    const token = String(this.#id(key));
    const shared = this.#refs.get(token);
    if (shared !== undefined) {
      this.#singletonRefs.set(key, shared);
      return shared;
    }
    const ref = this.#members.length;
    // Not frozen: dense identity plots intern one singleton per row, so a
    // freeze per row showed up in profiles. The array is never exposed for
    // mutation (keys() consumers get it read-only by type) — immutable by
    // convention, as with candidate coincident stacks.
    this.#members.push([key]);
    this.#refs.set(token, ref);
    this.#singletonRefs.set(key, ref);
    return ref;
  }

  keys(ref: LineageRef): readonly Key[] {
    return this.#members[ref] ?? this.#members[this.empty]!;
  }

  count(ref: LineageRef): number {
    return this.keys(ref).length;
  }

  get size(): number {
    return this.#members.length;
  }

  #id(key: Key): number {
    let id = this.#ids.get(key);
    if (id === undefined) {
      id = this.#ids.size;
      this.#ids.set(key, id);
    }
    return id;
  }
}
