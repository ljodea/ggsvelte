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

  intern(keys: Iterable<Key>): LineageRef {
    // Shared frozen arrays (identity-index buckets) intern once; skip re-sort/tokenize.
    if (Array.isArray(keys) && Object.isFrozen(keys)) {
      const cached = this.#byArray.get(keys);
      if (cached !== undefined) return cached;
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
