/**
 * type-guards.ts — 15+ runtime TypeScript type guards
 *
 * Stop writing `if (typeof x === ...)` everywhere.
 * These guards are fully typed and work with TypeScript's
 * control flow analysis for automatic type narrowing.
 *
 * @example
 * if (isString(value)) { value.toUpperCase(); } // TypeScript knows it's string
 * if (isNonNullable(response.data)) { use(response.data); } // TypeScript knows it's not null/undefined
 */

// ─── Primitive Guards ─────────────────────────────────────────────────────────

export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function';

export const isSymbol = (value: unknown): value is symbol =>
  typeof value === 'symbol';

export const isBigInt = (value: unknown): value is bigint =>
  typeof value === 'bigint';

// ─── Nullability Guards ───────────────────────────────────────────────────────

export const isNull = (value: unknown): value is null => value === null;

export const isUndefined = (value: unknown): value is undefined =>
  value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

/**
 * isNonNullable — Narrows away null and undefined
 *
 * @example
 * const items = [1, null, 2, undefined, 3];
 * const nonNull = items.filter(isNonNullable); // type: number[]
 */
export const isNonNullable = <T>(value: T): value is NonNullable<T> =>
  value !== null && value !== undefined;

// ─── Object Guards ────────────────────────────────────────────────────────────

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isArray = <T = unknown>(value: unknown): value is T[] =>
  Array.isArray(value);

export const isDate = (value: unknown): value is Date =>
  value instanceof Date && !isNaN(value.getTime());

export const isError = (value: unknown): value is Error =>
  value instanceof Error;

export const isPromise = <T = unknown>(value: unknown): value is Promise<T> =>
  value instanceof Promise ||
  (isObject(value) && isFunction((value as any).then));

// ─── String Content Guards ────────────────────────────────────────────────────

/**
 * isNonEmptyString — Guards against empty strings
 *
 * @example
 * const names = ['Alice', '', 'Bob', '  '].filter(isNonEmptyString);
 * // Result: ['Alice', 'Bob', '  ']
 */
export const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.length > 0;

/**
 * isFilledString — Guards against empty or whitespace-only strings
 */
export const isFilledString = (value: unknown): value is string =>
  isString(value) && value.trim().length > 0;

// ─── Key Check Guards ─────────────────────────────────────────────────────────

/**
 * hasKey — Check if an object has a specific key
 *
 * @example
 * if (hasKey(response, 'data')) { console.log(response.data); }
 */
export function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * hasKeys — Check if an object has all specified keys
 *
 * @example
 * if (hasKeys(user, ['id', 'email', 'name'])) {
 *   // TypeScript knows user has id, email, name
 * }
 */
export function hasKeys<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every((key) => key in obj);
}

// ─── Enum Guard ───────────────────────────────────────────────────────────────

/**
 * isEnumValue — Check if value is a valid enum member
 *
 * @example
 * enum Status { Active = 'active', Inactive = 'inactive' }
 * const isStatus = isEnumValue(Status);
 * if (isStatus(rawValue)) { setStatus(rawValue); } // rawValue is Status
 */
export function isEnumValue<T extends Record<string, string | number>>(
  enumObj: T
): (value: unknown) => value is T[keyof T] {
  const values = new Set(Object.values(enumObj));
  return (value: unknown): value is T[keyof T] => values.has(value as T[keyof T]);
}

// ─── Array Content Guards ─────────────────────────────────────────────────────

/**
 * isArrayOf — Check if value is an array where every element passes a guard
 *
 * @example
 * if (isArrayOf(data, isString)) { data.join(', '); } // data is string[]
 * if (isArrayOf(data, isNumber)) { data.reduce((a, b) => a + b, 0); } // data is number[]
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(guard);
}

// ─── Utility: assert ─────────────────────────────────────────────────────────

/**
 * assert — Throw if condition is false (type assertion)
 *
 * @example
 * assert(isString(value), 'Expected value to be a string');
 * value.toUpperCase(); // TypeScript knows it's string after assert
 */
export function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/**
 * assertNonNullable — Throw if value is null/undefined
 *
 * @example
 * assertNonNullable(document.getElementById('app'), '#app element not found');
 * // TypeScript knows it's non-null after this
 */
export function assertNonNullable<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  assert(isNonNullable(value), message);
}
