/**
 * Collects values observed inside MSW resolver callbacks.
 *
 * A plain `let value = null` would be flow-narrowed to `null` at the read site
 * because the assignment happens in a callback the compiler cannot follow.
 * The collector keeps the declared type visible to the test.
 */

/** Read access to the values observed by a capture collector. */
export interface Capture<T> {
  /** Records one observed value. */
  add(value: T): void;
  /** Returns the most recently observed value, if any. */
  latest(): T | undefined;
  /** Returns every observed value in order. */
  all(): readonly T[];
}

/**
 * Creates a capture collector for one observed value type.
 *
 * @returns Collector with `add`, `latest` and `all`.
 */
export function createCapture<T>(): Capture<T> {
  const values: T[] = [];
  return {
    add(value: T): void {
      values.push(value);
    },
    latest(): T | undefined {
      return values.at(-1);
    },
    all(): readonly T[] {
      return values;
    },
  };
}
